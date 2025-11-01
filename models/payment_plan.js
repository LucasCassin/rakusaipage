import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

async function create(planData) {
  // MUDANÇA: A validação agora usa as chaves que criamos no validator.js
  const validatedData = validator(planData, {
    name: "required",
    description: "optional",
    full_value: "required",
    period_unit: "required",
    period_value: "required",
  });

  const query = {
    text: `
      INSERT INTO payment_plans (name, description, full_value, period_unit, period_value)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `,
    values: [
      validatedData.name,
      validatedData.description,
      validatedData.full_value,
      validatedData.period_unit,
      validatedData.period_value,
    ],
  };

  const results = await database.query(query);
  return results.rows[0];
}

async function findAll() {
  const query = {
    text: `SELECT * FROM payment_plans ORDER BY created_at ASC;`,
  };
  const results = await database.query(query);
  return results.rows;
}

async function findById(planId) {
  const validatedId = validator({ id: planId }, { id: "required" });
  const query = {
    text: `SELECT * FROM payment_plans WHERE id = $1;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows[0];
}

async function update(planId, updateData) {
  const validatedId = validator({ id: planId }, { id: "required" });
  // MUDANÇA: A validação agora usa as chaves que criamos no validator.js
  const validatedData = validator(updateData, {
    name: "optional",
    description: "optional",
    full_value: "optional",
    period_unit: "optional",
    period_value: "optional",
  });

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  const updateValues = Object.values(validatedData);

  if (updateValues.length === 0) {
    return findById(planId);
  }

  const query = {
    text: `
      UPDATE payment_plans
      SET ${updateFields}, updated_at = now()
      WHERE id = $${updateValues.length + 1}
      RETURNING *;
    `,
    values: [...updateValues, validatedId.id],
  };

  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Deleta um plano de pagamento.
 * Lança um erro se o plano estiver associado a qualquer assinatura (ativa ou não).
 * @param {string} planId - O UUID do plano a ser deletado.
 */
async function del(planId) {
  // 2. Valida o ID
  const validatedId = validator({ id: planId }, { id: "required|uuid" });

  // 3. VERIFICAÇÃO DE USO: Checa se algum usuário está inscrito neste plano
  const checkQuery = {
    text: `SELECT COUNT(*) FROM user_subscriptions WHERE plan_id = $1;`,
    values: [validatedId.id],
  };

  const checkResult = await database.query(checkQuery);
  const subscriptionCount = parseInt(checkResult.rows[0].count, 10);

  // 4. REGRA DE NEGÓCIO: Se estiver em uso, bloqueia a exclusão
  if (subscriptionCount > 0) {
    throw new ForbiddenError({
      message: "Este plano de pagamento não pode ser deletado.",
      action: `Este plano está associado a ${subscriptionCount} assinatura(s) e não pode ser removido.`,
    });
  }

  // 5. Se chegou aqui, o plano não está em uso e pode ser deletado
  const deleteQuery = {
    text: `DELETE FROM payment_plans WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };

  const results = await database.query(deleteQuery);

  // 6. Se a exclusão não afetou nenhuma linha (plano não existia)
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Plano de pagamento não encontrado." });
  }

  return results.rows[0];
}

/**
 * Conta quantas assinaturas ATIVAS estão associadas a um plano.
 * @param {string} planId - O UUID do plano.
 * @returns {Promise<number>} A contagem de assinaturas ativas.
 */
async function findActiveSubscriptionCount(planId) {
  const validatedId = validator({ id: planId }, { id: "required" });

  const query = {
    text: `
      SELECT COUNT(*) as count 
      FROM user_subscriptions 
      WHERE plan_id = $1 AND is_active = true;
    `,
    values: [validatedId.id],
  };

  const results = await database.query(query);
  return parseInt(results.rows[0].count, 10);
}

/**
 * Conta QUANTAS ASSINATURAS (ativas ou não) estão associadas a um plano.
 * @param {string} planId - O UUID do plano.
 * @returns {Promise<number>} A contagem total de assinaturas.
 */
async function findTotalSubscriptionCount(planId) {
  const validatedId = validator({ id: planId }, { id: "required|uuid" });

  const query = {
    text: `SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_id = $1;`,
    values: [validatedId.id],
  };

  const results = await database.query(query);
  return parseInt(results.rows[0].count, 10);
}

export default {
  create,
  findAll,
  findById,
  update,
  del,
  findActiveSubscriptionCount,
  findTotalSubscriptionCount,
};
