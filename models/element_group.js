import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ServiceError } from "errors/index.js";

/**
 * Atualiza os dados de um grupo (ex: nome, usuário).
 * Nota: Isso não move elementos, apenas altera os metadados do grupo.
 */
async function update(groupId, data) {
  const validatedData = validator(data, {
    display_name: "optional",
    assigned_user_id: "optional",
  });

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  if (Object.keys(validatedData).length === 0) {
    return findGroupById(groupId); // Retorna o original
  }

  const query = {
    text: `
      UPDATE element_groups SET ${updateFields}
      WHERE id = $${Object.keys(validatedData).length + 1}
      RETURNING *;
    `,
    values: [...Object.values(validatedData), groupId],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Grupo de elementos não encontrado." });
  }
  return results.rows[0];
}

/**
 * Deleta um grupo E TODOS os seus elementos (via ON DELETE CASCADE).
 */
async function del(groupId) {
  const validatedId = validator({ id: groupId }, { id: "required" });
  const query = {
    text: `DELETE FROM element_groups WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Grupo de elementos não encontrado." });
  }
  return results.rows[0];
}

/**
 * Busca um grupo (sem seus elementos).
 */
async function findGroupById(groupId) {
  const validatedId = validator({ id: groupId }, { id: "required" });
  const query = {
    text: `SELECT * FROM element_groups WHERE id = $1;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Função principal do Agrupamento:
 * Move todos os 'scene_elements' de um 'sourceGroupId' para um 'targetGroupId'
 * e depois deleta o 'sourceGroup' (que ficou vazio).
 */
async function merge(targetGroupId, sourceGroupId) {
  // 1. Validar IDs
  const validatedIds = validator(
    { targetGroupId, sourceGroupId },
    {
      targetGroupId: "required",
      sourceGroupId: "required",
    },
  );

  // Não permitir fusão de um grupo nele mesmo
  if (validatedIds.targetGroupId === validatedIds.sourceGroupId) {
    throw new ServiceError({
      message: "Não é possível fundir um grupo com ele mesmo.",
      statusCode: 400,
    });
  }

  // 2. Iniciar transação
  const client = await database.getNewClient();
  try {
    await client.query("BEGIN");

    // 3. Query 1: Re-atribuir todos os elementos do sourceGroup para o targetGroup
    const updateQuery = {
      text: `
        UPDATE scene_elements 
        SET group_id = $1 
        WHERE group_id = $2
        RETURNING id;
      `,
      values: [validatedIds.targetGroupId, validatedIds.sourceGroupId],
    };
    const updateResult = await client.query(updateQuery);

    if (updateResult.rowCount === 0) {
      // Isso pode acontecer se o sourceGroup já estava vazio.
      // Não é um erro, mas precisamos deletá-lo.
    }

    // 4. Query 2: Deletar o sourceGroup, que agora está vazio
    const deleteQuery = {
      text: `DELETE FROM element_groups WHERE id = $1;`,
      values: [validatedIds.sourceGroupId],
    };
    await client.query(deleteQuery);

    // 5. Commit
    await client.query("COMMIT");

    // Retorna o número de elementos que foram movidos
    return { elements_moved: updateResult.rowCount };
  } catch (error) {
    await client.query("ROLLBACK");
    const specificError = database.handleDatabaseError(error);
    throw specificError;
  } finally {
    await client.end();
  }
}

export default {
  update,
  del,
  findGroupById,
  merge,
};
