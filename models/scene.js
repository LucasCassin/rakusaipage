import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";
import presentationViewer from "models/presentation_viewer.js";

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
              se.scene_id = $1;
          `,
          values: [scene.id],
        };
        const elementsResults = await database.query(elementsQuery);
        elements = elementsResults.rows;
      }

      if (scene.scene_type === "TRANSITION") {
        // --- REFATORADO: Busca assignees (M-N) ---
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
              ts.scene_id = $1
            ORDER BY 
              ts."order";
          `,
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

/**
 * Executa a transação de clonagem de uma cena.
 * Lida com as 3 opções de colagem e o side effect de
 * adicionar usuários ao elenco (presentation_viewers).
 */
async function clone(sourceScene, targetPresentationId, pasteOption, newOrder) {
  // 1. Validar dados base
  const validatedIds = validator(
    {
      targetPresentationId,
      sourceSceneId: sourceScene.id,
      newOrder,
      pasteOption,
    },
    {
      targetPresentationId: "required",
      sourceSceneId: "required",
      newOrder: "required",
      pasteOption: "required",
    },
  );

  // Garantir que temos os detalhes da cena fonte (assignees, elements, steps)
  // Caso o objeto sourceScene passado seja "raso" (apenas dados da tabela scenes)
  let sourceData = sourceScene;
  if (
    (!sourceData.scene_elements && sourceData.scene_type === "FORMATION") ||
    (!sourceData.transition_steps && sourceData.scene_type === "TRANSITION")
  ) {
    // Busca profunda para garantir que temos os assignees
    const [fetchedScene] = await findAllFromPresentation(
      sourceScene.presentation_id,
    );
    // Precisamos filtrar a cena correta caso findAll retorne várias
    if (fetchedScene.id === sourceScene.id) {
      sourceData = fetchedScene;
    } else {
      // Fallback: Busca todas e encontra a certa
      const allScenes = await findAllFromPresentation(
        sourceScene.presentation_id,
      );
      sourceData = allScenes.find((s) => s.id === sourceScene.id) || sourceData;
    }
  }

  const client = await database.getNewClient();
  try {
    await client.query("BEGIN");

    // 2. Criar a nova cena (Base)
    const newSceneName = `(Cópia) ${sourceData.name || "Sem Título"}`;
    const sceneQuery = {
      text: `
        INSERT INTO scenes 
          (presentation_id, "order", name, scene_type, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `,
      values: [
        validatedIds.targetPresentationId,
        validatedIds.newOrder,
        newSceneName,
        sourceData.scene_type,
        sourceData.description || null,
      ],
    };
    const sceneResult = await client.query(sceneQuery);
    const newScene = sceneResult.rows[0];

    // 3. [Side Effect] Adicionar Usuários ao Elenco (se 'with_users')
    if (validatedIds.pasteOption === "with_users") {
      const userIds = new Set();

      // Coleta IDs dos arrays 'assignees'
      if (sourceData.scene_type === "FORMATION") {
        sourceData.elements?.forEach((el) => {
          // 'elements' vem do findAllFromPresentation
          if (Array.isArray(el.assignees)) {
            el.assignees.forEach((id) => userIds.add(id));
          }
        });
        // Fallback para 'scene_elements' se o objeto vier de outro lugar
        sourceData.scene_elements?.forEach((el) => {
          if (Array.isArray(el.assignees)) {
            el.assignees.forEach((id) => userIds.add(id));
          }
        });
      } else {
        // TRANSITION
        sourceData.steps?.forEach((step) => {
          if (Array.isArray(step.assignees)) {
            step.assignees.forEach((id) => userIds.add(id));
          }
        });
        sourceData.transition_steps?.forEach((step) => {
          if (Array.isArray(step.assignees)) {
            step.assignees.forEach((id) => userIds.add(id));
          }
        });
      }

      // Adiciona usuários usando a transação 'client'
      for (const userId of userIds) {
        await presentationViewer.addViewer(
          validatedIds.targetPresentationId,
          userId,
          { useClient: client },
        );
      }
    }

    // 4. Clonar Conteúdo (FORMATION)
    if (sourceData.scene_type === "FORMATION") {
      const sourceElements =
        sourceData.elements || sourceData.scene_elements || [];

      // 4.1. Recriar os grupos
      const groupsMap = new Map();
      sourceElements.forEach((el) => {
        const groupId = el.group_id;
        if (!groupsMap.has(groupId)) {
          groupsMap.set(groupId, {
            display_name: el.display_name,
            assignees: el.assignees || [], // Copia o array
            elements: [],
          });
        }
        groupsMap.get(groupId).elements.push(el);
      });

      // 4.2. Iterar e criar os novos grupos e elementos
      for (const [_, groupData] of groupsMap.entries()) {
        let newDisplayName = null;

        if (
          validatedIds.pasteOption === "with_names" ||
          validatedIds.pasteOption === "with_users"
        ) {
          newDisplayName = groupData.display_name;
        }

        const groupQuery = {
          text: `
            INSERT INTO element_groups (scene_id, display_name) 
            VALUES ($1, $2) RETURNING id
          `,
          values: [newScene.id, newDisplayName],
        };
        const newGroupId = (await client.query(groupQuery)).rows[0].id;

        // B. Inserir Assignees do Grupo (Novo)
        if (
          validatedIds.pasteOption === "with_users" &&
          groupData.assignees.length > 0
        ) {
          const placeholders = groupData.assignees
            .map((_, idx) => `($1, $${idx + 2})`)
            .join(", ");
          const values = [newGroupId, ...groupData.assignees];
          await client.query({
            text: `INSERT INTO element_group_assignees (element_group_id, user_id) VALUES ${placeholders}`,
            values: values,
          });
        }

        // C. Criar os 'scene_elements' (BULK INSERT)
        const elementValues = [];
        const elementParams = [];
        groupData.elements.forEach((el, index) => {
          const i = index * 5;
          elementParams.push(
            `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`,
          );
          elementValues.push(
            newScene.id,
            el.element_type_id,
            newGroupId,
            el.position_x,
            el.position_y,
          );
        });

        if (elementValues.length > 0) {
          const elementQuery = {
            text: `
              INSERT INTO scene_elements 
                (scene_id, element_type_id, group_id, position_x, position_y) 
              VALUES ${elementParams.join(", ")}
            `,
            values: elementValues,
          };
          await client.query(elementQuery);
        }
      }
    }

    // 5. Clonar Conteúdo (TRANSITION)
    if (sourceData.scene_type === "TRANSITION") {
      const sourceSteps = sourceData.steps || sourceData.transition_steps || [];

      if (sourceSteps.length > 0) {
        // Precisamos inserir um por um ou em lote, mas precisamos dos IDs gerados para inserir os assignees
        // Faremos um por um para garantir a associação correta de assignees, ou insert com returning id e mapeamento.
        // Para simplicidade e segurança na ordem, vamos iterar.

        for (const step of sourceSteps) {
          // A. Inserir Passo
          const stepQuery = {
            text: `INSERT INTO transition_steps (scene_id, description, "order") VALUES ($1, $2, $3) RETURNING id`,
            values: [newScene.id, step.description, step.order],
          };
          const stepResult = await client.query(stepQuery);
          const newStepId = stepResult.rows[0].id;

          // B. Inserir Assignees
          if (
            validatedIds.pasteOption === "with_users" &&
            step.assignees &&
            step.assignees.length > 0
          ) {
            const placeholders = step.assignees
              .map((_, idx) => `($1, $${idx + 2})`)
              .join(", ");
            const values = [newStepId, ...step.assignees];
            await client.query({
              text: `INSERT INTO transition_step_assignees (transition_step_id, user_id) VALUES ${placeholders}`,
              values: values,
            });
          }
        }
      }
    }

    // 6. Finalizar
    await client.query("COMMIT");

    return newScene;
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    }
    const specificError = database.handleDatabaseError(error);
    throw specificError;
  } finally {
    await client.end();
  }
}

async function checkSceneViewer(sceneId, userId) {
  const validated = validator(
    { sceneId, userId },
    { sceneId: "required", userId: "required" },
  );

  const query = {
    text: `
      SELECT p.id
      FROM scenes s
      JOIN presentations p ON s.presentation_id = p.id
      LEFT JOIN presentation_viewers pv ON p.id = pv.presentation_id
      WHERE s.id = $1
        AND (
          p.is_public = true 
          OR p.created_by_user_id = $2
          OR pv.user_id = $2
        );
    `,
    values: [validated.sceneId, validated.userId],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Cena não encontrada ou você não tem permissão para vê-la.",
    });
  }
  return true;
}

export default {
  findAllFromPresentation,
  findById,
  create,
  clone,
  update,
  del,
  checkSceneViewer,
};
