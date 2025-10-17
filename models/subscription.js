import database from "infra/database.js";
import validator from "models/validator.js";
import payment from "models/payment.js";
import plan from "models/payment_plan.js";
import { NotFoundError } from "errors/index.js";

/**
 * Cria uma nova assinatura e sua primeira cobrança dentro de uma transação.
 */
async function create(subscriptionData) {
  const validatedData = validator(subscriptionData, {
    user_id: "required",
    plan_id: "required",
    discount_value: "optional",
    payment_day: "required",
    start_date: "required",
  });

  const associatedPlan = await plan.findById(validatedData.plan_id);
  if (!associatedPlan) {
    throw new NotFoundError({ message: "Plano de pagamento não encontrado." });
  }

  const client = await database.getNewClient();
  try {
    await client.query("BEGIN");

    const associatedPlan = await plan.findById(validatedData.plan_id);
    if (!associatedPlan) {
      // Lançar erro dentro do try/catch para acionar o rollback
      throw new NotFoundError({
        message: "Plano de pagamento não encontrado.",
      });
    }

    const subscriptionQuery = {
      text: `INSERT INTO user_subscriptions (user_id, plan_id, discount_value, payment_day, start_date)
             VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
      values: [
        validatedData.user_id,
        validatedData.plan_id,
        validatedData.discount_value || 0.0,
        validatedData.payment_day,
        validatedData.start_date,
      ],
    };

    const subscriptionResult = await client.query(subscriptionQuery);
    const newSubscription = subscriptionResult.rows[0];

    await payment.createInitialPayment(newSubscription, associatedPlan, client);

    await client.query("COMMIT");
    return newSubscription;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client?.end();
  }
}
/**
 * Busca uma assinatura específica pelo seu ID.
 */
async function findById(subscriptionId) {
  const validatedId = validator({ id: subscriptionId }, { id: "required" });
  const query = {
    text: `SELECT * FROM user_subscriptions WHERE id = $1;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Busca todas as assinaturas de um usuário específico.
 */
async function findByUserId(userId) {
  const validatedId = validator({ id: userId }, { id: "required" });
  const query = {
    text: `
      SELECT sub.*, plan.name as plan_name 
      FROM user_subscriptions sub
      JOIN payment_plans plan ON sub.plan_id = plan.id
      WHERE sub.user_id = $1;
    `,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows;
}

/**
 * Atualiza os dados de uma assinatura (ex: desconto, status de ativação).
 */
async function update(subscriptionId, updateData) {
  const validatedId = validator({ id: subscriptionId }, { id: "required" });
  const validatedData = validator(updateData, {
    discount_value: "optional",
    is_active: "optional",
  });

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

  const updateValues = Object.values(validatedData);

  if (updateValues.length === 0) {
    return findById(subscriptionId);
  }

  const query = {
    text: `
      UPDATE user_subscriptions
      SET ${updateFields}, updated_at = now()
      WHERE id = $${updateValues.length + 1}
      RETURNING *;
    `,
    values: [...updateValues, validatedId.id],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Assinatura não encontrada." });
  }
  return results.rows[0];
}

/**
 * Busca todas as assinaturas (função de admin).
 */
async function findAll() {
  const query = {
    text: `
      SELECT sub.*, plan.name as plan_name, u.username 
      FROM user_subscriptions sub
      JOIN payment_plans plan ON sub.plan_id = plan.id
      JOIN users u ON sub.user_id = u.id
      ORDER BY sub.created_at DESC;
    `,
  };
  const results = await database.query(query);
  return results.rows;
}

/**
 * Deleta uma assinatura.
 */
async function del(subscriptionId) {
  const validatedId = validator(
    { id: subscriptionId },
    { id: "required|uuid" },
  );
  const query = {
    text: `DELETE FROM user_subscriptions WHERE id = $1 RETURNING id;`,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({ message: "Assinatura não encontrada." });
  }
  return results.rows[0];
}

export default {
  create,
  findById,
  findByUserId,
  update,
  findAll,
  del,
};
