import database from "infra/database.js";
import validator from "models/validator.js";
import payment from "models/payment.js";
import plan from "models/payment_plan.js";
import { NotFoundError, ValidationError } from "errors/index.js";

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

  // (Verificação rápida fora da transação - opcional, mas boa)
  const associatedPlan = await plan.findById(validatedData.plan_id);
  if (!associatedPlan) {
    throw new NotFoundError({ message: "Plano de pagamento não encontrado." });
  }

  const client = await database.getNewClient();
  try {
    await client.query("BEGIN");

    // (Verificação real dentro da transação)
    const associatedPlan = await plan.findById(validatedData.plan_id);
    if (!associatedPlan) {
      throw new NotFoundError({
        message: "Plano de pagamento não encontrado.",
      });
    }

    // --- INÍCIO DA NOVA VALIDAÇÃO ---
    // 2. Converta os valores para números para comparação
    const discount = parseFloat(validatedData.discount_value || 0.0);
    const fullValue = parseFloat(associatedPlan.full_value);

    // 3. Verifique a regra de negócio
    if (discount > fullValue) {
      throw new ValidationError({
        message:
          "O valor do desconto não pode ser maior que o valor total do plano.",
        action: "Verifique o valor do desconto e tente novamente.",
      });
    }
    // --- FIM DA NOVA VALIDAÇÃO ---

    const subscriptionQuery = {
      text: `INSERT INTO user_subscriptions (user_id, plan_id, discount_value, payment_day, start_date)
             VALUES ($1, $2, $3, $4, $5) RETURNING *;`,
      values: [
        validatedData.user_id,
        validatedData.plan_id,
        discount, // 4. Use o valor já validado e convertido
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
 * Busca todas as assinaturas de um usuário específico.
 */
async function findByUsername(username) {
  const validatedId = validator(
    { username: username },
    { username: "required" },
  );
  const query = {
    text: `
      SELECT sub.*, plan.name as plan_name, plan.full_value as plan_full_value, plan.description as plan_description
      FROM user_subscriptions sub
      JOIN payment_plans plan ON sub.plan_id = plan.id
      WHERE sub.user_id = (SELECT DISTINCT id FROM users WHERE UPPER(username) = UPPER($1) ORDER BY id ASC LIMIT 1);
    `,
    values: [validatedId.username],
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

  const updateValues = Object.values(validatedData);

  if (updateValues.length === 0) {
    return findById(subscriptionId); // Retorna o estado atual se nada for enviado
  }

  // --- INÍCIO DA NOVA VALIDAÇÃO ---

  // Se o 'discount_value' está sendo atualizado,
  // precisamos verificar a regra de negócio ANTES de salvar.
  if (validatedData.discount_value !== undefined) {
    // 1. Busca a assinatura atual para obter o plan_id
    const currentSubscription = await findById(validatedId.id);
    if (!currentSubscription) {
      throw new NotFoundError({ message: "Assinatura não encontrada." });
    }

    // 2. Busca o plano associado
    const associatedPlan = await plan.findById(currentSubscription.plan_id);
    if (!associatedPlan) {
      throw new NotFoundError({
        message: "Plano de pagamento associado não encontrado.",
      });
    }

    // 3. Converte e compara os valores
    const discount = parseFloat(validatedData.discount_value);
    const fullValue = parseFloat(associatedPlan.full_value);

    if (discount > fullValue) {
      throw new ValidationError({
        message:
          "O valor do desconto não pode ser maior que o valor total do plano.",
        action: "Verifique o valor do desconto e tente novamente.",
      });
    }
  }
  // --- FIM DA NOVA VALIDAÇÃO ---

  const updateFields = Object.keys(validatedData)
    .map((key, index) => `"${key}" = $${index + 1}`)
    .join(", ");

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
    // Isso não deve acontecer por causa da verificação findById,
    // mas é uma boa proteção.
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
      SELECT sub.*, plan.name as plan_name, u.username, plan.full_value as plan_full_value, plan.description as plan_description 
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
  findByUsername,
  update,
  findAll,
  del,
};
