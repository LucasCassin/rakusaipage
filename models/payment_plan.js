import database from "infra/database.js";
import validator from "models/validator.js";

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
 * A DB vai impedir a deleção se houver assinaturas ativas.
 * @param {string} planId - O UUID do plano a ser deletado.
 */
async function del(planId) {
  const validatedId = validator({ id: planId }, { id: "required" });
  const query = {
    text: `DELETE FROM payment_plans WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
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

export default {
  create,
  findAll,
  findById,
  update,
  del,
  findActiveSubscriptionCount,
};
