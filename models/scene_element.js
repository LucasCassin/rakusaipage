import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "errors/index.js";

/**
 * Cria um novo "Grupo de Elemento" (que conterá 1 elemento inicial).
 * (Refatorado para retornar o objeto completo com JOIN)
 */
async function create(data) {
  // 1. Validar os dados
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

    // 4. Query 1: Criar o element_group
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

    // 5. Query 2: Criar o scene_element
    const elementQuery = {
      text: `
        INSERT INTO scene_elements 
          (scene_id, element_type_id, group_id, position_x, position_y)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id; -- (Alterado de * para id)
      `,
      values: [
        validatedData.scene_id,
        validatedData.element_type_id,
        groupId,
        validatedData.position_x,
        validatedData.position_y,
      ],
    };
    const elementResult = await client.query(elementQuery);
    const newElementId = elementResult.rows[0].id;

    // --- CORREÇÃO (Insight do Usuário) ---
    // 6. Buscar o elemento completo (com JOIN) usando o 'findById'
    // Passamos o 'client' para reutilizar a transação
    const newFullElement = await findById(newElementId, { useClient: client });
    // --- Fim da Correção ---

    // 7. Confirmar transação
    await client.query("COMMIT");

    // 8. Retornar o objeto completo
    return newFullElement;
  } catch (error) {
    // 9. Reverter em caso de falha
    await client.query("ROLLBACK");
    // (Mantendo o handler de erro, como solicitado)
    if (!error.code) {
      throw error;
    } else {
      const specificError = database.handleDatabaseError(error);
      throw specificError;
    }
  } finally {
    // 10. Liberar o cliente
    await client.end();
  }
}

/**
 * Atualiza um scene_element (ex: posição) e/ou
 * seu grupo associado (ex: display_name).
 * (Refatorado para SEMPRE retornar o objeto completo com JOIN)
 */
async function update(elementId, data) {
  // 1. Validar todos os campos possíveis
  const validatedData = validator(data, {
    position_x: "optional",
    position_y: "optional",
    display_name: "optional",
    assigned_user_id: "optional",
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
  if (validatedData.assigned_user_id !== undefined)
    groupData.assigned_user_id = validatedData.assigned_user_id;

  const elementKeys = Object.keys(elementData);
  const groupKeys = Object.keys(groupData);

  if (elementKeys.length === 0 && groupKeys.length === 0) {
    return findById(elementId);
  }

  // 3. Iniciar transação
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    // 4. Buscar o group_id (e validar se existe)
    // --- CORREÇÃO (Insight do Usuário): 'findById' valida o 'elementId' ---
    const currentElement = await findById(elementId, { useClient: client });

    if (!currentElement) {
      throw new NotFoundError({ message: "Elemento de cena não encontrado." });
    }
    const { group_id } = currentElement;
    // --- Fim da Correção ---

    // 5. Atualizar scene_elements (se houver dados)
    if (elementKeys.length > 0) {
      const elementUpdateFields = elementKeys
        .map((key, index) => `"${key}" = $${index + 1}`)
        .join(", ");

      const elementUpdateQuery = {
        text: `
          UPDATE scene_elements SET ${elementUpdateFields}
          WHERE id = $${elementKeys.length + 1}; -- (Removido RETURNING *)
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

    // 7. Commit
    await client.query("COMMIT");

    // 8. Buscar o estado final (com JOIN) fora da transação
    // (Não podemos usar o 'client' aqui, pois ele pode ter
    // 'visto' os dados antigos antes do 'findById' ser chamado)
    // Usamos 'findById' com a conexão padrão (pós-commit).
    const updatedFullElement = await findById(elementId);
    return updatedFullElement;
  } catch (error) {
    await client.query("ROLLBACK");
    // (Mantendo o handler de erro, como solicitado)
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
 * (Refatorado para retornar o objeto completo que foi deletado)
 */
async function del(elementId) {
  const validatedId = validator({ id: elementId }, { id: "required" });
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    // --- CORREÇÃO (Insight do Usuário) ---
    // 1. Buscar o objeto completo (com JOIN) ANTES de deletar
    // e validar se existe.
    const elementToDelete = await findById(validatedId.id, {
      useClient: client,
    });

    if (!elementToDelete) {
      throw new NotFoundError({ message: "Elemento de cena não encontrado." });
    }
    const { group_id } = elementToDelete;
    // --- Fim da Correção ---

    // 2. Deletar o elemento (não precisa mais do RETURNING)
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
    // (Mantendo o handler de erro, como solicitado)
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
 * com seu grupo (element_group) para trazer display_name e assigned_user_id.
 * (Sem alterações, esta função já estava correta)
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
