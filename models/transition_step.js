import database from "infra/database.js";
import validator from "models/validator.js";
import { settings } from "config/settings.js";
import { NotFoundError, ValidationError } from "errors/index.js";

const MAX_ASSIGNEES = settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_STEP;

/**
 * Busca os usuários associados a um passo de transição.
 * @param {string} stepId - O ID do passo de transição.
 * @param {object} options - Opções, ex: { useClient: client }
 * @returns {Promise<Array<string>>} - Um array de IDs de usuário.
 */
async function findAssigneesByStepId(stepId, { useClient } = {}) {
  const db = useClient || database;
  const query = {
    text: `SELECT user_id FROM transition_step_assignees WHERE transition_step_id = $1;`,
    values: [stepId],
  };
  const results = await db.query(query);
  return results.rows.map((row) => row.user_id);
}

/**
 * Substitui os usuários associados a um passo de transição.
 * @param {string} stepId - O ID do passo de transição.
 * @param {Array<string>} assignees - O array de IDs de usuário.
 * @param {object} options - Opções, ex: { useClient: client }
 */
async function setAssigneesForStep(stepId, assignees = [], { useClient } = {}) {
  const db = useClient || database;

  // 1. Validar duplicatas na entrada
  const uniqueAssignees = [...new Set(assignees)];
  if (uniqueAssignees.length > MAX_ASSIGNEES) {
    throw new ValidationError({
      message: `Um passo de transição pode ter no máximo ${MAX_ASSIGNEES} usuário(s) associado(s).`,
      statusCode: 400,
    });
  }

  // 2. Limpar associações antigas
  await db.query({
    text: `DELETE FROM transition_step_assignees WHERE transition_step_id = $1;`,
    values: [stepId],
  });

  // 3. Inserir novas associações (se houver)
  if (uniqueAssignees.length > 0) {
    const valuesPlaceholders = uniqueAssignees
      .map((_, index) => `($1, $${index + 2})`)
      .join(", ");

    const values = [stepId, ...uniqueAssignees];

    await db.query({
      text: `
        INSERT INTO transition_step_assignees (transition_step_id, user_id)
        VALUES ${valuesPlaceholders};
      `,
      values: values,
    });
  }
}

async function create(data) {
  // 1. Validar dados
  const validatedData = validator(data, {
    scene_id: "required",
    order: "required",
    description: "required",
    assignees: "optional",
  });

  const { scene_id, order, description, assignees } = validatedData;
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    // 2. Criar o 'transition_step'
    const stepQuery = {
      text: `
        INSERT INTO transition_steps (scene_id, "order", description)
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
      values: [scene_id, order, description],
    };
    const stepResult = await client.query(stepQuery);
    const newStep = stepResult.rows[0];

    // 3. Associar os usuários
    if (assignees && assignees.length > 0) {
      await setAssigneesForStep(newStep.id, assignees, { useClient: client });
    }

    await client.query("COMMIT");

    // 4. Retornar o objeto completo (com os 'assignees' populados)
    const fullStep = await findById(newStep.id);
    return fullStep;
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

async function update(stepId, data) {
  // 1. Validar dados
  const validatedData = validator(data, {
    order: "optional",
    description: "optional",
    assignees: "optional",
  });

  const { assignees, ...stepData } = validatedData;
  const stepFields = Object.keys(stepData);

  // Se nada foi enviado
  if (stepFields.length === 0 && assignees === undefined) {
    return findById(stepId);
  }

  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    // 2. Atualizar 'transition_steps' (se houver)
    if (stepFields.length > 0) {
      const updateFields = stepFields
        .map((key, index) => `"${key}" = $${index + 1}`)
        .join(", ");

      const query = {
        text: `
          UPDATE transition_steps SET ${updateFields}
          WHERE id = $${stepFields.length + 1}
          RETURNING id;
        `,
        values: [...Object.values(stepData), stepId],
      };

      const results = await client.query(query);
      if (results.rowCount === 0) {
        throw new NotFoundError({
          message: "Passo de transição não encontrado.",
        });
      }
    }

    // 3. Atualizar 'assignees' (se o array foi enviado)
    // Se 'assignees' for 'undefined', não mexemos.
    // Se 'assignees' for '[]', limpamos os associados.
    if (assignees !== undefined) {
      // Validar se o 'stepId' existe (caso 'stepFields' esteja vazio)
      if (stepFields.length === 0) {
        const check = await findById(stepId, { useClient: client });
        if (!check) {
          throw new NotFoundError({
            message: "Passo de transição não encontrado.",
          });
        }
      }
      await setAssigneesForStep(stepId, assignees, { useClient: client });
    }

    await client.query("COMMIT");

    // 4. Retornar o objeto completo (pós-commit)
    const updatedFullStep = await findById(stepId);
    if (!updatedFullStep) {
      // Caso raro (deletado entre o commit e o findById)
      throw new NotFoundError({
        message: "Passo de transição não encontrado.",
      });
    }
    return updatedFullStep;
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

async function del(stepId) {
  const validatedId = validator({ id: stepId }, { id: "required" });

  // A tabela 'transition_step_assignees' tem 'onDelete: "CASCADE"',
  // então não precisamos de transação, o DB cuida da limpeza.

  // Vamos buscar o objeto ANTES de deletar, para poder retorná-lo
  const stepToDelete = await findById(validatedId.id);
  if (!stepToDelete) {
    throw new NotFoundError({ message: "Passo de transição não encontrado." });
  }

  const query = {
    text: `DELETE FROM transition_steps WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };

  const results = await database.query(query);

  if (results.rowCount === 0) {
    // Isso não deve acontecer por causa do check anterior, mas é uma boa guarda
    throw new NotFoundError({ message: "Passo de transição não encontrado." });
  }

  // Retorna o objeto que foi deletado (agora com assignees)
  return stepToDelete;
}

/**
 * Busca um 'transition_step' e faz JOIN com seus 'assignees'.
 */
async function findById(stepId, { useClient } = {}) {
  const validatedId = validator({ id: stepId }, { id: "required" });
  const db = useClient || database;

  const query = {
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
        ts.id = $1;
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
};
