import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

async function create(data, created_by_user_id) {
  // Valida o user_id separadamente, pois ele vem da sessão
  const validatedUserId = validator(
    { user_id: created_by_user_id },
    {
      user_id: "required",
    },
  );

  const validatedData = validator(data, {
    name: "required",
    date: "optional",
    location: "optional",
    meet_time: "optional",
    meet_location: "optional",
    description: "optional",
    is_public: "optional",
  });

  const query = {
    text: `
      INSERT INTO presentations 
        (name, date, location, meet_time, meet_location, description, is_public, created_by_user_id)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `,
    values: [
      validatedData.name,
      validatedData.date || null,
      validatedData.location || null,
      validatedData.meet_time || null,
      validatedData.meet_location || null,
      validatedData.description || null,
      validatedData.is_public || false,
      validatedUserId.user_id,
    ],
  };

  const results = await database.query(query);
  return results.rows[0];
}

async function update(presentation_id, data) {
  // Valida os dados do body
  const validatedData = validator(data, {
    name: "optional",
    date: "optional",
    location: "optional",
    meet_time: "optional",
    meet_location: "optional",
    description: "optional",
    is_public: "optional",
  });

  // Valida os IDs
  const validatedIds = validator(
    { presentation_id },
    {
      presentation_id: "required",
    },
  );

  const originalPresentation = await findById(validatedIds.presentation_id);
  if (!originalPresentation) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }

  // Constrói o SET clause APENAS com os dados do body
  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  if (Object.keys(validatedData).length === 0) return originalPresentation;

  const query = {
    text: `
      UPDATE presentations
      SET ${updateFields}, updated_at = now()
      WHERE id = $${Object.keys(validatedData).length + 1}
      RETURNING *;
    `,
    values: [...Object.values(validatedData), validatedIds.presentation_id],
  };

  const results = await database.query(query);
  return results.rows[0];
}

async function del(presentation_id) {
  const validatedData = validator(
    { presentation_id },
    { presentation_id: "required" },
  );

  const presentation = await findById(validatedData.presentation_id);
  if (!presentation) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }
  // if (presentation.created_by_user_id !== validatedData.user_id) {
  //   throw new ForbiddenError({
  //     message: "Você não tem permissão para deletar esta apresentação.",
  //   });
  // }

  const query = {
    text: `DELETE FROM presentations WHERE id = $1 RETURNING id;`,
    values: [validatedData.presentation_id],
  };
  await database.query(query);
  return { id: validatedData.presentation_id };
}

async function findById(presentation_id) {
  const validatedData = validator(
    { presentation_id },
    { presentation_id: "required" },
  );
  const query = {
    text: `SELECT * FROM presentations WHERE id = $1;`,
    values: [validatedData.presentation_id],
  };
  const results = await database.query(query);
  return results.rows[0];
}

async function findAllForUser(user_id) {
  const validatedId = validator({ user_id }, { user_id: "required" });

  const query = {
    text: `
      SELECT p.* FROM presentations p
      LEFT JOIN presentation_viewers pv ON p.id = pv.presentation_id
      WHERE 
        p.created_by_user_id = $1 OR pv.user_id = $1
      GROUP BY p.id
      ORDER BY p.date DESC, p.created_at DESC;
    `,
    values: [validatedId.user_id],
  };

  const results = await database.query(query);
  return results.rows;
}

async function findDeepById(presentation_id) {
  const validatedId = validator(
    { presentation_id },
    { presentation_id: "required" },
  );

  // 1. Busca a apresentação principal
  const presentationQuery = {
    text: `SELECT * FROM presentations WHERE id = $1;`,
    values: [validatedId.presentation_id],
  };

  // 2. Busca todas as cenas, ordenadas
  const scenesQuery = {
    text: `SELECT * FROM scenes WHERE presentation_id = $1 ORDER BY "order";`,
    values: [validatedId.presentation_id],
  };

  // 3. Busca todos os elementos (de todas as cenas)
  const elementsQuery = {
    text: `
      SELECT el.*, et.name as element_type_name, et.image_url
      FROM scene_elements el
      JOIN scenes s ON el.scene_id = s.id
      JOIN element_types et ON el.element_type_id = et.id
      WHERE s.presentation_id = $1;
    `,
    values: [validatedId.presentation_id],
  };

  // 4. Busca todos os passos de transição (de todas as cenas)
  const stepsQuery = {
    text: `
      SELECT ts.* FROM transition_steps ts
      JOIN scenes s ON ts.scene_id = s.id
      WHERE s.presentation_id = $1
      ORDER BY ts."order";
    `,
    values: [validatedId.presentation_id],
  };

  const [presentationResult, scenesResult, elementsResult, stepsResult] =
    await Promise.all([
      database.query(presentationQuery),
      database.query(scenesQuery),
      database.query(elementsQuery),
      database.query(stepsQuery),
    ]);

  if (presentationResult.rows.length === 0) {
    return undefined;
  }

  const presentation = presentationResult.rows[0];
  const allElements = elementsResult.rows;
  const allSteps = stepsResult.rows;

  // 5. Junta o JSON (Nesting)
  presentation.scenes = scenesResult.rows.map((scene) => {
    scene.scene_elements = allElements.filter((el) => el.scene_id === scene.id);
    scene.transition_steps = allSteps.filter((st) => st.scene_id === scene.id);
    return scene;
  });

  return presentation;
}

/**
 * Busca o "pool" de nomes e usuários únicos
 * associados aos elementos de uma apresentação.
 * (REFATORADO para usar 'element_groups')
 */
async function findElementPool(presentationId) {
  const validatedId = validator(
    { presentation_id: presentationId },
    { presentation_id: "required" },
  );

  // Foco da Mudança: A query agora busca em 'element_groups' (eg)
  // e não mais em 'scene_elements' (se).
  const query = {
    text: `
      SELECT 
        DISTINCT eg.display_name, 
        eg.assigned_user_id, 
        u.username 
      FROM 
        element_groups eg
      JOIN 
        scenes s ON eg.scene_id = s.id
      LEFT JOIN 
        users u ON eg.assigned_user_id = u.id
      WHERE 
        s.presentation_id = $1 
        AND eg.display_name IS NOT NULL;
    `,
    values: [validatedId.presentation_id],
  };
  const results = await database.query(query);
  return results.rows;
}

async function updateElementGlobally(presentation_id, data) {
  // Valida os IDs de contexto
  const validatedIds = validator(
    {
      presentation_id: presentation_id,
      element_type_id: data.element_type_id,
    },
    {
      presentation_id: "required",
      element_type_id: "required",
    },
  );

  // Valida os dados (nomes) individualmente usando as regras do 'validator.js'
  const validatedOldName = validator(
    { display_name: data.old_display_name },
    {
      display_name: "required",
    },
  );
  const validatedNewName = validator(
    { display_name: data.new_display_name },
    {
      display_name: "required",
    },
  );

  // Valida o ID de usuário (opcional)
  const validatedNewUserId = validator(
    { assigned_user_id: data.new_assigned_user_id },
    {
      assigned_user_id: "optional",
    },
  );

  // Encontra todos os scene_elements IDs que correspondem
  const findQuery = {
    text: `
      SELECT se.id FROM scene_elements se
      JOIN scenes s ON se.scene_id = s.id
      WHERE s.presentation_id = $1
        AND se.element_type_id = $2
        AND se.display_name = $3;
    `,
    values: [
      validatedIds.presentation_id,
      validatedIds.element_type_id,
      validatedOldName.display_name, // Usa o valor validado
    ],
  };

  const elementsToUpdate = await database.query(findQuery);
  const elementIds = elementsToUpdate.rows.map((row) => row.id);

  if (elementIds.length === 0) {
    return { updatedCount: 0 };
  }

  // Executa o update em massa
  const updateQuery = {
    text: `
      UPDATE scene_elements
      SET 
        display_name = $1,
        assigned_user_id = $2
      WHERE id = ANY($3::uuid[]);
    `,
    values: [
      validatedNewName.display_name, // Usa o valor validado
      validatedNewUserId.assigned_user_id || null, // Usa o valor validado
      elementIds,
    ],
  };

  const results = await database.query(updateQuery);
  return { updatedCount: results.rowCount };
}

async function reorderScenes(presentation_id, scene_ids) {
  const validatedData = validator(
    { presentation_id, scene_ids },
    {
      presentation_id: "required",
      scene_ids: "required",
    },
  );

  if (
    !Array.isArray(validatedData.scene_ids) ||
    validatedData.scene_ids.length === 0
  ) {
    return; // Nada a fazer
  }

  const valuesString = validatedData.scene_ids
    .map((_, index) => `($${index * 2 + 2}::uuid, $${index * 2 + 3}::int)`)
    .join(", ");

  const queryValues = [validatedData.presentation_id];
  validatedData.scene_ids.forEach((sceneId, index) => {
    queryValues.push(sceneId);
    queryValues.push(index); // A nova ordem é o índice no array
  });

  const query = {
    text: `
      UPDATE scenes AS s
      SET "order" = v.new_order
      FROM (VALUES ${valuesString}) AS v(id, new_order)
      WHERE s.id = v.id AND s.presentation_id = $1;
    `,
    values: queryValues,
  };

  await database.query(query);
}

export default {
  create,
  update,
  del,
  findById,
  findAllForUser,
  findDeepById,
  findElementPool,
  updateElementGlobally,
  reorderScenes,
};
