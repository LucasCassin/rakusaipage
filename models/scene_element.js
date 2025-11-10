import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";

/**
 * Cria um novo "Grupo de Elemento" (que conterá 1 elemento inicial).
 * Esta é a ação de "arrastar um item novo" para o palco.
 */
async function create(data) {
  // 1. Validar os dados que vêm do frontend/API
  const validatedData = validator(data, {
    scene_id: "required",
    element_type_id: "required",
    position_x: "required",
    position_y: "required",
    display_name: "optional",
    assigned_user_id: "optional",
  });

  // 2. Usar um cliente persistente para a transação
  const client = await database.getNewClient();

  try {
    // 3. Iniciar transação
    await client.query("BEGIN");

    // 4. Query 1: Criar o element_group (a "entidade")
    const groupQuery = {
      text: `
        INSERT INTO element_groups 
          (scene_id, display_name, assigned_user_id)
        VALUES ($1, $2, $3)
        RETURNING id;
      `,
      values: [
        validatedData.scene_id,
        validatedData.display_name || null,
        validatedData.assigned_user_id || null,
      ],
    };
    const groupResult = await client.query(groupQuery);
    const groupId = groupResult.rows[0].id;

    // 5. Query 2: Criar o scene_element (o "ícone")
    const elementQuery = {
      text: `
        INSERT INTO scene_elements 
          (scene_id, element_type_id, group_id, position_x, position_y)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `,
      values: [
        validatedData.scene_id,
        validatedData.element_type_id,
        groupId, // Associando ao grupo recém-criado
        validatedData.position_x,
        validatedData.position_y,
      ],
    };
    const elementResult = await client.query(elementQuery);

    // 6. Confirmar transação
    await client.query("COMMIT");

    // 7. Retornar o elemento criado (que agora tem o group_id)
    return elementResult.rows[0];
  } catch (error) {
    // 8. Reverter em caso de falha
    await client.query("ROLLBACK");
    const specificError = database.handleDatabaseError(error);
    throw specificError;
  } finally {
    // 9. Liberar o cliente
    await client.end();
  }
}

/**
 * Atualiza um scene_element (ex: posição) e/ou
 * seu grupo associado (ex: display_name).
 */
async function update(elementId, data) {
  // 1. Validar todos os campos possíveis
  const validatedData = validator(data, {
    position_x: "optional",
    position_y: "optional",
    display_name: "optional",
    assigned_user_id: "optional",
  });

  // 2. Separar os dados (o que é do elemento, o que é do grupo)
  const elementData = {};
  const groupData = {};

  if (validatedData.position_x !== undefined)
    elementData.position_x = validatedData.position_x;
  if (validatedData.position_y !== undefined)
    elementData.position_y = validatedData.position_y;
  if (validatedData.display_name !== undefined)
    groupData.display_name = validatedData.display_name;
  if (validatedData.assigned_user_id !== undefined)
    groupData.assigned_user_id = validatedData.assigned_user_id;

  const elementKeys = Object.keys(elementData);
  const groupKeys = Object.keys(groupData);

  // Se nada foi enviado, retorna o elemento como está
  if (elementKeys.length === 0 && groupKeys.length === 0) {
    return findById(elementId);
  }

  // 3. Iniciar transação
  const client = await database.getNewClient();
  let updatedElement;

  try {
    await client.query("BEGIN");

    // 4. Buscar o group_id (e travar a linha do elemento para o update)
    const selectQuery = {
      text: `SELECT group_id FROM scene_elements WHERE id = $1 FOR UPDATE;`,
      values: [elementId],
    };
    const selectResult = await client.query(selectQuery);

    if (selectResult.rowCount === 0) {
      throw new NotFoundError({ message: "Elemento de cena não encontrado." });
    }
    const { group_id } = selectResult.rows[0];

    // 5. Atualizar scene_elements (se houver dados)
    if (elementKeys.length > 0) {
      const elementUpdateFields = elementKeys
        .map((key, index) => `"${key}" = $${index + 1}`)
        .join(", ");

      const elementUpdateQuery = {
        text: `
          UPDATE scene_elements SET ${elementUpdateFields}
          WHERE id = $${elementKeys.length + 1}
          RETURNING *;
        `,
        values: [...Object.values(elementData), elementId],
      };
      const elementResult = await client.query(elementUpdateQuery);
      updatedElement = elementResult.rows[0];
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

    // 7. Commit
    await client.query("COMMIT");

    // 8. Se só atualizamos o grupo, o 'updatedElement' estará vazio.
    // Então, buscamos o elemento atualizado para retornar.
    if (!updatedElement) {
      updatedElement = await findById(elementId, { useClient: client });
    }

    return updatedElement;
  } catch (error) {
    await client.query("ROLLBACK");
    const specificError = database.handleDatabaseError(error);
    throw specificError;
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

    // 1. Buscar group_id e deletar o elemento
    const deleteQuery = {
      text: `DELETE FROM scene_elements WHERE id = $1 RETURNING group_id, id;`,
      values: [validatedId.id],
    };
    const deleteResult = await client.query(deleteQuery);

    if (deleteResult.rowCount === 0) {
      throw new NotFoundError({ message: "Elemento de cena não encontrado." });
    }

    const { group_id } = deleteResult.rows[0];
    const deletedElement = deleteResult.rows[0];

    // 2. Verificar se o grupo ficou "órfão"
    const countQuery = {
      text: `SELECT COUNT(*) AS count FROM scene_elements WHERE group_id = $1;`,
      values: [group_id],
    };
    const countResult = await client.query(countQuery);
    const { count } = countResult.rows[0];

    // 3. Se o grupo ficou órfão (count == 0), deletá-lo
    if (count == 0) {
      await client.query({
        text: `DELETE FROM element_groups WHERE id = $1;`,
        values: [group_id],
      });
    }

    // 4. Commit
    await client.query("COMMIT");
    return deletedElement; // Retorna o elemento que foi deletado
  } catch (error) {
    await client.query("ROLLBACK");
    const specificError = database.handleDatabaseError(error);
    throw specificError;
  } finally {
    await client.end();
  }
}

/**
 * Busca um único elemento (scene_element) e faz JOIN
 * com seu grupo (element_group) para trazer display_name e assigned_user_id.
 */
async function findById(elementId, { useClient } = {}) {
  const validatedId = validator({ id: elementId }, { id: "required" });
  const query = {
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
        se.id = $1;
    `,
    values: [validatedId.id],
  };

  // Permite reutilizar um cliente de uma transação existente (se necessário)
  const db = useClient || database;
  const results = await db.query(query);
  return results.rows[0];
}

export default {
  create,
  update,
  del,
  findById,
};
