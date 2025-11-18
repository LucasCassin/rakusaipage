import database from "infra/database.js";
import validator from "models/validator.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "errors/index.js";
import { settings } from "config/settings.js";

// --- HELPER INTERNO PARA ASSIGNEES ---
const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_GROUP;

async function setAssigneesForGroup(
  groupId,
  assignees = [],
  { useClient } = {},
) {
  const db = useClient || database;
  const uniqueAssignees = [...new Set(assignees)];

  if (uniqueAssignees.length > MAX_ASSIGNEES) {
    throw new ValidationError({
      message: `Um elemento/grupo pode ter no máximo ${MAX_ASSIGNEES} usuário(s) associado(s).`,
      statusCode: 400,
    });
  }

  await db.query({
    text: `DELETE FROM element_group_assignees WHERE element_group_id = $1;`,
    values: [groupId],
  });

  if (uniqueAssignees.length > 0) {
    const valuesPlaceholders = uniqueAssignees
      .map((_, index) => `($1, $${index + 2})`)
      .join(", ");
    const values = [groupId, ...uniqueAssignees];
    await db.query({
      text: `
        INSERT INTO element_group_assignees (element_group_id, user_id)
        VALUES ${valuesPlaceholders};
      `,
      values: values,
    });
  }
}
// -------------------------------------

async function create(data, created_by_user_id) {
  const validatedUserId = validator(
    { user_id: created_by_user_id },
    { user_id: "required" },
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

async function update(presentationId, data) {
  const validatedData = validator(data, {
    name: "optional",
    date: "optional",
    location: "optional",
    meet_time: "optional",
    meet_location: "optional",
    description: "optional",
    is_public: "optional",
  });

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  if (Object.keys(validatedData).length === 0) {
    return findById(presentationId);
  }

  const query = {
    text: `
      UPDATE presentations SET ${updateFields}, updated_at = now()
      WHERE id = $${Object.keys(validatedData).length + 1}
      RETURNING *;
    `,
    values: [...Object.values(validatedData), presentationId],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }
  return results.rows[0];
}

async function del(presentationId) {
  const validatedId = validator({ id: presentationId }, { id: "required" });
  const query = {
    text: `DELETE FROM presentations WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }
  return results.rows[0];
}

async function findAllByUserId(userId) {
  const validatedId = validator({ id: userId }, { id: "required" });
  const query = {
    text: `
      SELECT p.*
      FROM presentations p
      LEFT JOIN presentation_viewers pv ON p.id = pv.presentation_id
      WHERE p.created_by_user_id = $1 OR pv.user_id = $1
      ORDER BY p.date DESC, p.created_at DESC;
    `,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows;
}

async function findById(presentationId) {
  const validatedId = validator({ id: presentationId }, { id: "required" });
  const query = {
    text: `SELECT * FROM presentations WHERE id = $1;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows[0];
}

async function findDeepById(presentationId) {
  const validatedId = validator({ id: presentationId }, { id: "required" });

  const presentation = await findById(validatedId.id);
  if (!presentation) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }

  const scenesQuery = {
    text: `SELECT * FROM scenes WHERE presentation_id = $1 ORDER BY "order";`,
    values: [validatedId.id],
  };
  const scenesResults = await database.query(scenesQuery);
  presentation.scenes = scenesResults.rows;

  // --- CORREÇÃO: JOIN com as novas tabelas de assignees ---
  const elementsQuery = {
    text: `
      SELECT 
        se.*,
        eg.display_name,
        COALESCE(
          (
            SELECT json_agg(ega.user_id)
            FROM element_group_assignees ega
            WHERE ega.element_group_id = eg.id
          ),
          '[]'::json
        ) AS assignees
      FROM 
        scene_elements se
      JOIN 
        element_groups eg ON se.group_id = eg.id
      WHERE 
        se.scene_id IN (SELECT id FROM scenes WHERE presentation_id = $1);
    `,
    values: [validatedId.id],
  };

  const stepsQuery = {
    text: `
      SELECT 
        ts.*,
        COALESCE(
          (
            SELECT json_agg(tsa.user_id)
            FROM transition_step_assignees tsa
            WHERE tsa.transition_step_id = ts.id
          ),
          '[]'::json
        ) AS assignees
      FROM 
        transition_steps ts
      WHERE 
        ts.scene_id IN (SELECT id FROM scenes WHERE presentation_id = $1)
      ORDER BY 
        ts."order";
    `,
    values: [validatedId.id],
  };
  // -------------------------------------------------------

  const [elementsResults, stepsResults] = await Promise.all([
    database.query(elementsQuery),
    database.query(stepsQuery),
  ]);

  const elementsMap = new Map();
  for (const element of elementsResults.rows) {
    if (!elementsMap.has(element.scene_id)) {
      elementsMap.set(element.scene_id, []);
    }
    elementsMap.get(element.scene_id).push(element);
  }

  const stepsMap = new Map();
  for (const step of stepsResults.rows) {
    if (!stepsMap.has(step.scene_id)) {
      stepsMap.set(step.scene_id, []);
    }
    stepsMap.get(step.scene_id).push(step);
  }

  for (const scene of presentation.scenes) {
    scene.scene_elements = elementsMap.get(scene.id) || [];
    scene.transition_steps = stepsMap.get(scene.id) || [];
  }

  return presentation;
}

async function checkViewerOrCreator(presentationId, userId) {
  const validated = validator(
    { presentation_id: presentationId, user_id: userId },
    { presentation_id: "required", user_id: "required" },
  );

  const query = {
    text: `
      SELECT p.id, p.created_by_user_id, pv.user_id AS viewer_id
      FROM presentations p
      LEFT JOIN presentation_viewers pv ON p.id = pv.presentation_id AND pv.user_id = $2
      WHERE p.id = $1
        AND (p.created_by_user_id = $2 OR pv.user_id = $2 OR p.is_public = true);
    `,
    values: [validated.presentation_id, validated.user_id],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({
      message:
        "Apresentação não encontrada ou você não tem permissão para acessá-la.",
    });
  }

  const isCreator = results.rows[0].created_by_user_id === userId;
  return {
    ...results.rows[0],
    isCreator,
  };
}

async function findElementPool(presentationId) {
  const validatedId = validator(
    { presentation_id: presentationId },
    { presentation_id: "required" },
  );

  const query = {
    text: `
      WITH GroupedData AS (
        SELECT 
          eg.display_name,
          et.id AS element_type_id,
          et.name AS element_type_name,
          et.image_url,
          et.scale,
          et.image_url_highlight,
          (
            SELECT array_agg(u.username ORDER BY u.username)
            FROM element_group_assignees ega
            JOIN users u ON ega.user_id = u.id
            WHERE ega.element_group_id = eg.id
          ) AS assignee_names,
          (
            SELECT array_agg(u.id ORDER BY u.username)
            FROM element_group_assignees ega
            JOIN users u ON ega.user_id = u.id
            WHERE ega.element_group_id = eg.id
          ) AS assignees
        FROM 
          element_groups eg
        JOIN 
          scenes s ON eg.scene_id = s.id
        JOIN 
          scene_elements se ON se.group_id = eg.id
        JOIN 
          element_types et ON se.element_type_id = et.id
        WHERE 
          s.presentation_id = $1 
          AND eg.display_name IS NOT NULL
      )
      SELECT DISTINCT
        display_name,
        element_type_id,
        element_type_name,
        image_url,
        scale,
        image_url_highlight,
        COALESCE(assignee_names, '{}') AS assignee_names,
        COALESCE(assignees, '{}') AS assignees
      FROM GroupedData;
    `,
    values: [validatedId.presentation_id],
  };
  const results = await database.query(query);
  return results.rows;
}

/**
 * Atualiza globalmente o nome e os usuários de elementos iguais.
 * (REFATORADO para M-N assignees)
 */
async function updateElementGlobally(presentation_id, data) {
  // 1. Valida os IDs de contexto
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
  // Valida os dados (nomes)
  const validatedOldName = validator(
    { display_name: data.old_display_name },
    {
      display_name: "required",
    },
  );
  let validatedNewName = undefined;
  if (data.new_display_name !== undefined) {
    validatedNewName = validator(
      { display_name: data.new_display_name },
      {
        display_name: "optional",
      },
    );
  }
  // 3. Valida os novos assignees (Array de UUIDs)
  let validatedAssignees = undefined;
  if (data.new_assignees !== undefined) {
    validatedAssignees = validator(
      { assignees: data.new_assignees },
      {
        assignees: "optional",
      },
    );
  }
  // 4. Encontra todos os 'element_groups' IDs que correspondem
  const findQuery = {
    text: `
      SELECT 
        eg.id 
      FROM 
        element_groups eg
      JOIN 
        scenes s ON eg.scene_id = s.id
      WHERE 
        s.presentation_id = $1
        AND eg.display_name = $2
        AND EXISTS (
          SELECT 1 
          FROM scene_elements se 
          WHERE se.group_id = eg.id 
            AND se.element_type_id = $3
        );
    `,
    values: [
      validatedIds.presentation_id,
      validatedOldName.display_name,
      validatedIds.element_type_id,
    ],
  };

  const groupsToUpdate = await database.query(findQuery);
  const groupIds = groupsToUpdate.rows.map((row) => row.id);

  if (groupIds.length === 0) {
    return { updatedCount: 0 };
  }

  // 5. Inicia Transação para Atualização em Massa
  const client = await database.getNewClient();
  try {
    await client.query("BEGIN");

    // 5.1 Atualizar o nome de exibição (Batch)
    if (validatedNewName?.display_name !== undefined) {
      await client.query({
        text: `
        UPDATE element_groups 
        SET display_name = $1
        WHERE id = ANY($2::uuid[])
      `,
        values: [validatedNewName.display_name, groupIds],
      });
    }
    // 5.2 Atualizar os assignees (Iterativo com Helper M-N)
    // (Só executa se 'new_assignees' foi passado)
    if (validatedAssignees?.assignees !== undefined) {
      await Promise.all(
        groupIds.map((groupId) =>
          setAssigneesForGroup(groupId, validatedAssignees.assignees, {
            useClient: client,
          }),
        ),
      );
    }

    await client.query("COMMIT");
    return { updatedCount: groupIds.length };
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    } else {
      throw database.handleDatabaseError(error);
    }
  } finally {
    await client.end();
  }
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
    return;
  }

  const valuesString = validatedData.scene_ids
    .map((_, index) => `($${index * 2 + 2}::uuid, $${index * 2 + 3}::int)`)
    .join(", ");

  const queryValues = [validatedData.presentation_id];
  validatedData.scene_ids.forEach((sceneId, index) => {
    queryValues.push(sceneId);
    queryValues.push(index);
  });

  const query = {
    text: `
      UPDATE scenes AS s
      SET "order" = v.new_order
      FROM (VALUES ${valuesString}) AS v(id, new_order)
      WHERE s.id = v.id
        AND s.presentation_id = $1;
    `,
    values: queryValues,
  };

  await database.query(query);
}

/**
 * Busca os IDs dos grupos de uma apresentação que correspondem
 * ao nome de exibição e tipo de elemento fornecidos.
 */
async function findGroupsByCriteria(
  presentation_id,
  { display_name, element_type_id },
) {
  const validatedData = validator(
    { presentation_id, display_name, element_type_id },
    {
      presentation_id: "required",
      display_name: "required",
      element_type_id: "required",
    },
  );

  const query = {
    text: `
      SELECT DISTINCT eg.id
      FROM element_groups eg
      JOIN scene_elements se ON eg.id = se.group_id
      JOIN scenes s ON eg.scene_id = s.id
      WHERE s.presentation_id = $1
        AND eg.display_name = $2
        AND se.element_type_id = $3;
    `,
    values: [
      validatedData.presentation_id,
      validatedData.display_name,
      validatedData.element_type_id,
    ],
  };

  const results = await database.query(query);
  return results.rows.map((row) => row.id);
}

export default {
  create,
  update,
  del,
  findAllByUserId,
  findById,
  findDeepById,
  checkViewerOrCreator,
  findElementPool,
  updateElementGlobally,
  reorderScenes,
  findGroupsByCriteria,
};
