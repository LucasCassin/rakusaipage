import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ServiceError, ValidationError } from "errors/index.js";
import { settings } from "config/settings.js";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_GROUP;

// --- HELPERS NECESSÁRIOS ---

/**
 * Helper: Substitui os usuários associados a um grupo.
 */
async function setAssigneesForGroup(
  groupId,
  assignees = [],
  { useClient } = {},
) {
  const db = useClient || database;

  // 1. Validar duplicatas e limite
  const uniqueAssignees = [...new Set(assignees)];
  if (uniqueAssignees.length > MAX_ASSIGNEES) {
    throw new ValidationError({
      message: `Um elemento/grupo pode ter no máximo ${MAX_ASSIGNEES} usuário(s) associado(s).`,
      statusCode: 400,
    });
  }

  // 2. Limpar associações antigas
  await db.query({
    text: `DELETE FROM element_group_assignees WHERE element_group_id = $1;`,
    values: [groupId],
  });

  // 3. Inserir novas
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
 * Helper: Busca um grupo pelo ID, incluindo o array de assignees.
 */
async function findGroupById(groupId, { useClient } = {}) {
  const validatedId = validator({ id: groupId }, { id: "required" });
  const db = useClient || database;

  const query = {
    text: `
      SELECT 
        eg.*,
        COALESCE(
          (
            SELECT json_agg(ega.user_id)
            FROM element_group_assignees ega
            WHERE ega.element_group_id = eg.id
          ),
          '[]'::json
        ) AS assignees
      FROM 
        element_groups eg
      WHERE 
        eg.id = $1;
    `,
    values: [validatedId.id],
  };

  const results = await db.query(query);
  return results.rows[0];
}

// --- FUNÇÃO UPDATE REFATORADA ---

async function update(groupId, data) {
  const validatedData = validator(data, {
    display_name: "optional",
    assignees: "optional:arrayOf-uuid", // Nova validação de array
  });

  const { display_name, assignees } = validatedData;
  const hasName = display_name !== undefined;
  const hasAssignees = assignees !== undefined;

  // Se nada foi enviado para atualizar, retorna o objeto atual
  if (!hasName && !hasAssignees) {
    return findGroupById(groupId);
  }

  // 2. Iniciar transação (necessária para atualizar 2 tabelas)
  const client = await database.getNewClient();
  try {
    await client.query("BEGIN");

    // 3. Verificar se o grupo existe
    const check = await client.query(
      "SELECT id FROM element_groups WHERE id = $1",
      [groupId],
    );
    if (check.rowCount === 0) {
      throw new NotFoundError({
        message: "Grupo de elementos não encontrado.",
      });
    }

    // 4. Atualizar display_name (se enviado)
    if (hasName) {
      await client.query({
        text: `UPDATE element_groups SET display_name = $1 WHERE id = $2;`,
        values: [display_name, groupId],
      });
    }

    // 5. Atualizar assignees (se enviado)
    if (hasAssignees) {
      await setAssigneesForGroup(groupId, assignees, { useClient: client });
    }

    await client.query("COMMIT");

    // 6. Retornar objeto completo (com array assignees)
    return await findGroupById(groupId);
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error; // Erros de validação (limite, etc)
    } else {
      throw database.handleDatabaseError(error);
    }
  } finally {
    await client.end();
  }
}

/**
 * Deleta um grupo.
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
 * Funde dois grupos.
 */
async function merge(targetGroupId, sourceGroupId) {
  const validatedIds = validator(
    { targetGroupId, sourceGroupId },
    {
      targetGroupId: "required",
      sourceGroupId: "required",
    },
  );

  if (validatedIds.targetGroupId === validatedIds.sourceGroupId) {
    throw new ServiceError({
      message: "Não é possível fundir um grupo com ele mesmo.",
      statusCode: 400,
    });
  }

  const client = await database.getNewClient();
  try {
    await client.query("BEGIN");

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

    const deleteQuery = {
      text: `DELETE FROM element_groups WHERE id = $1;`,
      values: [validatedIds.sourceGroupId],
    };
    await client.query(deleteQuery);

    await client.query("COMMIT");

    return { elements_moved: updateResult.rowCount };
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    }
    throw database.handleDatabaseError(error);
  } finally {
    await client.end();
  }
}

export default {
  update,
  del,
  merge,
  findGroupById,
};
