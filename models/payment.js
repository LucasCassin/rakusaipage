import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

/**
 * Calcula a próxima data de vencimento.
 */
function calculateNextDueDate(startDate, paymentDay, periodUnit, periodValue) {
  const nextDate = new Date(startDate);
  nextDate.setUTCHours(0, 0, 0, 0);

  if (periodUnit === "month") {
    nextDate.setUTCMonth(nextDate.getUTCMonth() + periodValue);
    nextDate.setUTCDate(paymentDay);
  } else if (periodUnit === "week") {
    nextDate.setUTCDate(nextDate.getUTCDate() + periodValue * 7);
  } else if (periodUnit === "day") {
    nextDate.setUTCDate(nextDate.getUTCDate() + periodValue);
  } else if (periodUnit === "year") {
    nextDate.setUTCFullYear(nextDate.getUTCFullYear() + periodValue);
    nextDate.setUTCDate(paymentDay);
  }

  return nextDate;
}

/**
 * Cria uma nova cobrança genérica. Usado pela tarefa agendada (cron job).
 */
async function create(paymentData) {
  const validatedData = validator(paymentData, {
    subscription_id: "required",
    due_date: "required",
    amount_due: "required",
  });
  const query = {
    text: `
      INSERT INTO payments (subscription_id, due_date, amount_due, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING *;
    `,
    values: [
      validatedData.subscription_id,
      validatedData.due_date,
      validatedData.amount_due,
    ],
  };

  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Cria a primeira cobrança para uma nova assinatura.
 */
async function createInitialPayment(subscription, plan, client) {
  const dueDate = calculateNextDueDate(
    subscription.start_date,
    subscription.payment_day,
    plan.period_unit,
    plan.period_value,
  );

  const amountDue = plan.full_value - subscription.discount_value;

  const query = {
    text: `
            INSERT INTO payments (subscription_id, due_date, amount_due, status)
            VALUES ($1, $2, $3, 'PENDING');
        `,
    values: [subscription.id, dueDate, amountDue],
  };

  await client.query(query);
}

/**
 * Usuário indica que realizou um pagamento.
 */
async function userIndicatePaid(paymentId, userId) {
  const query = {
    text: `
      UPDATE payments p SET 
        user_notified_payment = true,
        user_notified_at = now()
      FROM user_subscriptions sub
      WHERE p.id = $1 AND p.subscription_id = sub.id AND sub.user_id = $2 AND p.status = 'PENDING'
      RETURNING p.*;
    `,
    values: [paymentId, userId],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new ForbiddenError({
      message:
        "Pagamento não encontrado, já notificado/pago ou não pertence a este usuário.",
    });
  }
  return results.rows[0];
}

/**
 * Admin confirma o recebimento de um pagamento.
 */
async function adminConfirmPaid(paymentId) {
  const query = {
    text: `
            UPDATE payments SET 
                status = 'CONFIRMED',
                confirmed_at = now()
            WHERE id = $1 AND status <> 'CONFIRMED'
            RETURNING *;
        `,
    values: [paymentId],
  };

  const results = await database.query(query);
  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "Pagamento não encontrado ou já confirmado.",
    });
  }
  return results.rows[0];
}

/**
 * Busca todos os pagamentos de um usuário.
 */
async function findByUserId(userId) {
  const validatedId = validator({ id: userId }, { id: "required" });
  const query = {
    text: `
            SELECT 
              p.*, 
              plan.name as plan_name,
              sub.user_id
            FROM payments p
            JOIN user_subscriptions sub ON p.subscription_id = sub.id
            JOIN payment_plans plan ON sub.plan_id = plan.id
            WHERE sub.user_id = $1
            ORDER BY p.due_date DESC;
        `,
    values: [validatedId.id],
  };

  const results = await database.query(query);
  return results.rows;
}

/**
 * Busca todos os pagamentos de um usuário.
 */
async function findByUsername(username) {
  const validatedId = validator(
    { username: username },
    { username: "required" },
  );
  const query = {
    text: `
            SELECT 
              p.*, 
              plan.name as plan_name,
              sub.user_id
            FROM payments p
            JOIN user_subscriptions sub ON p.subscription_id = sub.id
            JOIN payment_plans plan ON sub.plan_id = plan.id
            WHERE sub.user_id = (SELECT id FROM users WHERE UPPER(username) = UPPER($1) ORDER BY id ASC LIMIT 1)
            ORDER BY p.due_date DESC;
        `,
    values: [validatedId.username],
  };

  const results = await database.query(query);
  return results.rows;
}

/**
 * Busca um pagamento específico pelo seu ID, incluindo o user_id.
 */
async function findById(paymentId) {
  const validatedId = validator({ id: paymentId }, { id: "required|uuid" });
  const query = {
    text: `
          SELECT 
            p.*,
            sub.user_id -- MUDANÇA: Adiciona o user_id ao resultado
          FROM payments p
          JOIN user_subscriptions sub ON p.subscription_id = sub.id
          WHERE p.id = $1;
        `,
    values: [validatedId.id],
  };
  const results = await database.query(query);
  return results.rows[0];
}

/**
 * Encontra pagamentos pendentes que passaram da data de vencimento e os atualiza para 'OVERDUE'.
 * Função a ser usada pela tarefa agendada (cron job).
 */
async function findAndSetOverdue() {
  const query = {
    text: `
      UPDATE payments
      SET status = 'OVERDUE'
      WHERE 
        status = 'PENDING' 
        AND due_date < CURRENT_DATE
      RETURNING *;
    `,
  };
  const results = await database.query(query);
  return results.rows; // Retorna os pagamentos que foram atualizados
}

/**
 * Busca todos os pagamentos no sistema (função de admin).
 */
async function findAll() {
  const query = {
    text: `
            SELECT 
              p.*, 
              plan.name as plan_name, 
              u.username,
              sub.user_id -- MUDANÇA: Adiciona o user_id ao resultado
            FROM payments p
            JOIN user_subscriptions sub ON p.subscription_id = sub.id
            JOIN payment_plans plan ON sub.plan_id = plan.id
            JOIN users u ON sub.user_id = u.id
            ORDER BY p.due_date DESC;
        `,
  };
  const results = await database.query(query);
  return results.rows;
}

export default {
  create,
  createInitialPayment,
  userIndicatePaid,
  adminConfirmPaid,
  findByUserId,
  findByUsername,
  findById,
  findAndSetOverdue,
  findAll, // Adicionar a nova função
};
