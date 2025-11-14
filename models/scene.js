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

  const client = await database.getNewClient();
  try {
    await client.query("BEGIN");

    // 2. Criar a nova cena (Base)
    const newSceneName = `(Cópia) ${sourceScene.name || "Sem Título"}`;
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
        sourceScene.scene_type,
        sourceScene.description || null,
      ],
    };
    const sceneResult = await client.query(sceneQuery);
    const newScene = sceneResult.rows[0];

    // 3. [Side Effect] Adicionar Usuários ao Elenco (se 'with_users')
    if (validatedIds.pasteOption === "with_users") {
      const userIds = new Set();
      
      if (sourceScene.scene_type === "FORMATION") {
        // (O 'sourceScene.scene_elements' vem do 'findDeepById', 
        // que já aplainou os dados do element_group)
        sourceScene.scene_elements?.forEach(el => {
          if (el.assigned_user_id) userIds.add(el.assigned_user_id);
        });
      } else { // TRANSITION
        sourceScene.transition_steps?.forEach(step => {
          if (step.assigned_user_id) userIds.add(step.assigned_user_id);
        });
      }

      // Adiciona usuários usando a transação 'client'
      for (const userId of userIds) {
        await presentationViewer.addViewer(
          validatedIds.targetPresentationId,
          userId,
          { useClient: client } // Passa o client
        );
      }
    }

    // 4. Clonar Conteúdo (FORMATION)
    if (sourceScene.scene_type === "FORMATION") {
      // 4.1. Recriar os grupos do 'sourceScene' (JSON)
      const groupsMap = new Map();
      sourceScene.scene_elements?.forEach(el => {
        const groupId = el.group_id;
        if (!groupsMap.has(groupId)) {
          groupsMap.set(groupId, {
            // (Dados do grupo, que estão achatados em 'el')
            display_name: el.display_name,
            assigned_user_id: el.assigned_user_id,
            // (Lista de elementos)
            elements: [],
          });
        }
        groupsMap.get(groupId).elements.push(el);
      });

      // 4.2. Iterar e criar os novos grupos e elementos
      for (const [sourceGroupId, groupData] of groupsMap.entries()) {
        // A. Definir dados do novo grupo baseado na 'pasteOption'
        let newDisplayName = null;
        let newAssignedUserId = null;

        if (validatedIds.pasteOption === "with_names" || validatedIds.pasteOption === "with_users") {
          newDisplayName = groupData.display_name;
        }
        if (validatedIds.pasteOption === "with_users") {
          newAssignedUserId = groupData.assigned_user_id;
        }

        // B. Criar o novo 'element_group'
        const groupQuery = {
          text: `
            INSERT INTO element_groups (scene_id, display_name, assigned_user_id) 
            VALUES ($1, $2, $3) RETURNING id
          `,
          values: [newScene.id, newDisplayName, newAssignedUserId],
        };
        const newGroupId = (await client.query(groupQuery)).rows[0].id;

        // C. Criar os 'scene_elements' (BULK INSERT)
        const elementValues = [];
        const elementParams = [];
        groupData.elements.forEach((el, index) => {
          const i = index * 5; // 5 colunas
          elementParams.push(`($${i+1}, $${i+2}, $${i+3}, $${i+4}, $${i+5})`);
          elementValues.push(
            newScene.id,
            el.element_type_id,
            newGroupId,
            el.position_x,
            el.position_y
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
    if (sourceScene.scene_type === "TRANSITION" && sourceScene.transition_steps?.length > 0) {
      const stepValues = [];
      const stepParams = [];

      sourceScene.transition_steps.forEach((step, index) => {
        let newAssignedUserId = null;
        if (validatedIds.pasteOption === "with_users") {
          newAssignedUserId = step.assigned_user_id;
        }
        
        const i = index * 4; // 4 colunas
        stepParams.push(`($${i+1}, $${i+2}, $${i+3}, $${i+4})`);
        stepValues.push(
          newScene.id,
          step.description,
          step.order,
          newAssignedUserId
        );
      });

      if (stepValues.length > 0) {
        const stepQuery = {
          text: `
            INSERT INTO transition_steps 
              (scene_id, description, "order", assigned_user_id) 
            VALUES ${stepParams.join(", ")}
          `,
          values: stepValues,
        };
        await client.query(stepQuery);
      }
    }

    // 6. Finalizar
    await client.query("COMMIT");
    
    // (Retorna a nova cena base. O 'refetch' do frontend
    // buscará os detalhes aninhados)
    return newScene; 

  } catch (error) {
    await client.query("ROLLBACK");
    const specificError = database.handleDatabaseError(error);
    throw specificError;
  } finally {
    await client.end();
  }
}

export default {
  findAllFromPresentation,
  create,
  update,
  del,
  findById,
  clone
};
