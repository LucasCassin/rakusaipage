import database from "infra/database.js";
import validator from "models/validator.js";
import { settings } from "config/settings.js";
import { NotFoundError, ValidationError } from "errors/index.js";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_GROUP;

/**
 * Busca os usuários associados a um grupo de elementos.
 * @param {string} groupId - O ID do grupo.
 * @param {object} options - Opções, ex: { useClient: client }
 * @returns {Promise<Array<string>>} - Um array de IDs de usuário.
 */
async function findAssigneesByGroupId(groupId, { useClient } = {}) {
  const db = useClient || database;
  const query = {
    text: `SELECT user_id FROM element_group_assignees WHERE element_group_id = $1;`,
    values: [groupId],
  };
  const results = await db.query(query);
  return results.rows.map((row) => row.user_id);
}

/**
 * Substitui os usuários associados a um grupo de elementos.
 * @param {string} groupId - O ID do grupo.
 * @param {Array<string>} assignees - O array de IDs de usuário.
 * @param {object} options - Opções, ex: { useClient: client }
 */
async function setAssigneesForGroup(
  groupId,
  assignees = [],
  { useClient } = {},
) {
  const db = useClient || database;

  // 1. Validar duplicatas na entrada
  const uniqueAssignees = [...new Set(assignees)];
  if (uniqueAssignees.length > MAX_ASSIGNEES) {
    throw new ValidationError({
      message: `Um elemento/grupo pode ter no máximo ${MAX_ASSIGNEES} usuário(s) associado(s).`,
    });
  }

  // 2. Limpar associações antigas
  await db.query({
    text: `DELETE FROM element_group_assignees WHERE element_group_id = $1;`,
    values: [groupId],
  });

  // 3. Inserir novas associações (se houver)
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

/**
 * Cria um novo "Grupo de Elemento" (que conterá 1 elemento inicial)
 * e associa os usuários.
 */
async function create(data) {
  // 1. Validar os dados
  const validatedData = validator(data, {
    scene_id: "required",
    element_type_id: "required",
    position_x: "required",
    position_y: "required",
    display_name: "optional",
    assignees: "optional",
  });

  const {
    scene_id,
    element_type_id,
    position_x,
    position_y,
    display_name,
    assignees,
  } = validatedData;

  // 2. Usar um cliente persistente para a transação
  const client = await database.getNewClient();

  try {
    // 3. Iniciar transação
    await client.query("BEGIN");

    // 4. Query 1: Criar o element_group
    const groupQuery = {
      text: `
        INSERT INTO element_groups (scene_id, display_name)
        VALUES ($1, $2)
        RETURNING id;
      `,
      values: [scene_id, display_name || null],
    };
    const groupResult = await client.query(groupQuery);
    const groupId = groupResult.rows[0].id;

    // 5. Associar os usuários ao grupo
    if (assignees && assignees.length > 0) {
      await setAssigneesForGroup(groupId, assignees, { useClient: client });
    }

    // 6. Query 2: Criar o scene_element
    const elementQuery = {
      text: `
        INSERT INTO scene_elements 
          (scene_id, element_type_id, group_id, position_x, position_y)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `,
      values: [scene_id, element_type_id, groupId, position_x, position_y],
    };
    const elementResult = await client.query(elementQuery);
    const newElementId = elementResult.rows[0].id;

    // 7. Buscar o elemento completo (com JOIN) usando o 'findById'
    const newFullElement = await findById(newElementId, { useClient: client });

    // 8. Confirmar transação
    await client.query("COMMIT");

    // 9. Retornar o objeto completo
    return newFullElement;
  } catch (error) {
    // 10. Reverter em caso de falha
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    } else {
      const specificError = database.handleDatabaseError(error);
      throw specificError;
    }
  } finally {
    // 11. Liberar o cliente
    await client.end();
  }
}

/**
 * Atualiza um scene_element (ex: posição) e/ou
 * seu grupo associado (ex: display_name, assignees).
 */
async function update(elementId, data) {
  // 1. Validar todos os campos possíveis
  const validatedData = validator(data, {
    position_x: "optional",
    position_y: "optional",
    display_name: "optional",
    assignees: "optional",
  });

  // 2. Separar os dados
  const elementData = {};
  const groupData = {};

  if (validatedData.position_x !== undefined)
    elementData.position_x = validatedData.position_x;
  if (validatedData.position_y !== undefined)
    elementData.position_y = validatedData.position_y;
  if (validatedData.display_name !== undefined)
    groupData.display_name = validatedData.display_name;

  // O array 'assignees' é tratado separadamente
  const { assignees } = validatedData;
  const elementKeys = Object.keys(elementData);
  const groupKeys = Object.keys(groupData);

  if (
    elementKeys.length === 0 &&
    groupKeys.length === 0 &&
    assignees === undefined
  ) {
    return findById(elementId);
  }

  // 3. Iniciar transação
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    // 4. Buscar o group_id (e validar se existe)
    const currentElement = await findById(elementId, { useClient: client });

    if (!currentElement) {
      throw new NotFoundError({ message: "Elemento de cena não encontrado." });
    }
    const { group_id } = currentElement;

    // 5. Atualizar scene_elements (se houver dados)
    if (elementKeys.length > 0) {
      const elementUpdateFields = elementKeys
        .map((key, index) => `"${key}" = $${index + 1}`)
        .join(", ");

      const elementUpdateQuery = {
        text: `
          UPDATE scene_elements SET ${elementUpdateFields}
          WHERE id = $${elementKeys.length + 1};
        `,
        values: [...Object.values(elementData), elementId],
      };
      await client.query(elementUpdateQuery);
    }

    // 6. Atualizar element_groups (se houver dados)
    if (groupKeys.length > 0) {
      const groupUpdateFields = groupKeys
        .map((key, index) => `"${key}" = $${index + 1}`)
        .join(", ");

      const groupUpdateQuery = {
        text: `
          UPDATE element_groups SET ${groupUpdateFields}
          WHERE id = $${groupKeys.length + 1};
        `,
        values: [...Object.values(groupData), group_id],
      };
      await client.query(groupUpdateQuery);
    }

    // 7. Atualizar 'assignees' (se o array foi enviado)
    if (assignees !== undefined) {
      await setAssigneesForGroup(group_id, assignees, { useClient: client });
    }

    // 8. Commit
    await client.query("COMMIT");

    // 9. Buscar o estado final (com JOIN) fora da transação
    const updatedFullElement = await findById(elementId);
    return updatedFullElement;
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    } else {
      const specificError = database.handleDatabaseError(error);
      throw specificError;
    }
  } finally {
    await client.end();
  }
}

/**
 * Deleta um scene_element.
 * Se for o último elemento do grupo, deleta o grupo também.
 */
async function del(elementId) {
  const validatedId = validator({ id: elementId }, { id: "required" });
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    // 1. Buscar o objeto completo (com JOIN) ANTES de deletar
    const elementToDelete = await findById(validatedId.id, {
      useClient: client,
    });

    if (!elementToDelete) {
      throw new NotFoundError({ message: "Elemento de cena não encontrado." });
    }
    const { group_id } = elementToDelete;

    // 2. Deletar o elemento
    const deleteQuery = {
      text: `DELETE FROM scene_elements WHERE id = $1;`,
      values: [validatedId.id],
    };
    await client.query(deleteQuery);

    // 3. Verificar se o grupo ficou "órfão"
    const countQuery = {
      text: `SELECT COUNT(*) AS count FROM scene_elements WHERE group_id = $1;`,
      values: [group_id],
    };
    const countResult = await client.query(countQuery);
    const { count } = countResult.rows[0];

    // 4. Se o grupo ficou órfão (count == 0), deletá-lo
    // O 'onDelete: "CASCADE"' na tabela 'element_group_assignees'
    // limpará os usuários associados.
    if (count == 0) {
      await client.query({
        text: `DELETE FROM element_groups WHERE id = $1;`,
        values: [group_id],
      });
    }

    // 5. Commit
    await client.query("COMMIT");
    // 6. Retorna o objeto completo que foi deletado
    return elementToDelete;
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    } else {
      const specificError = database.handleDatabaseError(error);
      throw specificError;
    }
  } finally {
    await client.end();
  }
}

/**
 * Busca um único elemento (scene_element) e faz JOIN
 * com seu grupo (element_group) e seus associados (element_group_assignees).
 */
async function findById(elementId, { useClient } = {}) {
  const validatedId = validator({ id: elementId }, { id: "required" });
  const db = useClient || database;

  const query = {
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
        se.id = $1;
    `,
    values: [validatedId.id],
  };

  const results = await db.query(query);
  return results.rows[0];
}

export default {
  create,
  update,
  del,
  findById,
  findAssigneesByGroupId,
};
