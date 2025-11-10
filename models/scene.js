import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";

/**
 * Busca todas as cenas de uma apresentação,
 * e para cada cena, busca seus detalhes (elementos ou passos).
 *
 * (REFATORADO para incluir o JOIN com 'element_groups')
 */
async function findAllFromPresentation(presentationId) {
  const validatedId = validator(
    { presentation_id: presentationId },
    { presentation_id: "required" },
  );
  // 1. Buscar todas as cenas da apresentação
  const scenesQuery = {
    text: `SELECT * FROM scenes WHERE presentation_id = $1 ORDER BY "order";`,
    values: [validatedId.presentation_id],
  };
  const scenesResults = await database.query(scenesQuery);
  const scenes = scenesResults.rows;

  // 2. Para cada cena, buscar seus dados específicos (elementos ou passos)
  const scenesWithDetails = await Promise.all(
    scenes.map(async (scene) => {
      let elements = [];
      let steps = [];

      if (scene.scene_type === "FORMATION") {
        // --- ESTA É A MUDANÇA ---
        // Query antiga: SELECT * FROM scene_elements WHERE scene_id = $1;
        const elementsQuery = {
          text: `
            SELECT 
              se.*,
              eg.display_name,
              eg.assigned_user_id
            FROM 
              scene_elements se
            JOIN 
              element_groups eg ON se.group_id = eg.id
            WHERE 
              se.scene_id = $1;
          `,
          values: [scene.id],
        };
        const elementsResults = await database.query(elementsQuery);
        elements = elementsResults.rows;
      }

      if (scene.scene_type === "TRANSITION") {
        // (A busca de 'transition_steps' não muda)
        const stepsQuery = {
          text: `SELECT * FROM transition_steps WHERE scene_id = $1 ORDER BY "order";`,
          values: [scene.id],
        };
        const stepsResults = await database.query(stepsQuery);
        steps = stepsResults.rows;
      }

      return {
        ...scene,
        elements,
        steps,
      };
    }),
  );
  return scenesWithDetails;
}

/**
 * Cria uma nova cena (FORMATION ou TRANSITION).
 * (Sem alterações)
 */
async function create(data) {
  const validatedData = validator(data, {
    presentation_id: "required",
    order: "required",
    name: "required",
    scene_type: "required",
    description: "optional",
  });

  const query = {
    text: `
      INSERT INTO scenes 
        (presentation_id, "order", name, scene_type, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `,
    values: [
      validatedData.presentation_id,
      validatedData.order,
      validatedData.name,
      validatedData.scene_type,
      validatedData.description || null,
    ],
  };
  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Atualiza os dados de uma cena (ex: nome, ordem).
 * (Sem alterações)
 */
async function update(sceneId, data) {
  const validatedData = validator(data, {
    name: "optional",
    description: "optional",
    order: "optional",
  });

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  if (Object.keys(validatedData).length === 0) {
    return findById(sceneId);
  }

  const query = {
    text: `
      UPDATE scenes SET ${updateFields}
      WHERE id = $${Object.keys(validatedData).length + 1}
      RETURNING *;
    `,
    values: [...Object.values(validatedData), sceneId],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Cena não encontrada." });
  }
  return results.rows[0];
}

/**
 * Deleta uma cena (e seus elementos/passos via ON DELETE CASCADE).
 * (Sem alterações)
 */
async function del(sceneId) {
  const validatedId = validator({ id: sceneId }, { id: "required" });
  const query = {
    text: `DELETE FROM scenes WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Cena não encontrada." });
  }
  return results.rows[0];
}

/**
 * Busca uma cena pelo ID.
 * (Sem alterações)
 */
async function findById(sceneId) {
  const validatedId = validator({ id: sceneId }, { id: "required" });
  const query = {
    text: `SELECT * FROM scenes WHERE id = $1;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows[0];
}

export default {
  findAllFromPresentation,
  create,
  update,
  del,
  findById,
};
