import database from "infra/database.js";
import payment, { calculateNextDueDate } from "models/payment.js";
import { emailService } from "services/emailService";
import userModel from "models/user";
import paymentPlanModel from "models/payment_plan";

/**
 * Tarefa 1: Gera os próximos pagamentos para assinaturas ativas.
 * Regra: Gera 10 dias antes da data de vencimento.
 */
async function generateNextPayments() {
  const today = new Date();
  const generationLimitDate = new Date();
  generationLimitDate.setDate(today.getDate() + 10); // Hoje + 10 dias

  // 1. Busca todas as assinaturas ativas com seus planos e o último pagamento gerado
  const query = `
    SELECT 
      sub.id as subscription_id, 
      sub.payment_day, 
      sub.discount_value,
      sub.user_id,
      sub.plan_id,
      plan.full_value,
      plan.period_unit,
      plan.period_value,
      MAX(p.due_date) as last_due_date
    FROM 
      user_subscriptions sub
    JOIN 
      payment_plans plan ON sub.plan_id = plan.id
    LEFT JOIN 
      payments p ON p.subscription_id = sub.id
    WHERE 
      sub.is_active = true
    GROUP BY 
      sub.id, plan.id
  `;

  const results = await database.query(query);
  const eligibleSubscriptions = results.rows;

  let paymentsGenerated = 0;

  // 2. Itera sobre cada assinatura elegível
  for (const sub of eligibleSubscriptions) {
    // 3. Calcula qual é a data de vencimento do *próximo* pagamento
    const nextDueDate = calculateNextDueDate(
      sub.last_due_date,
      sub.payment_day,
      sub.period_unit,
      sub.period_value,
    );

    // 4. Verifica se a data de vencimento está dentro da nossa "janela" de geração
    if (nextDueDate <= generationLimitDate) {
      // 5. Verifica se já não criamos este pagamento (prevenção de duplicatas)
      const existingPayment = await database.query({
        text: "SELECT id FROM payments WHERE subscription_id = $1 AND due_date = $2",
        values: [sub.subscription_id, nextDueDate.toISOString().split("T")[0]],
      });

      if (existingPayment.rows.length === 0) {
        // 6. Cria o novo pagamento
        const amountDue =
          parseFloat(sub.full_value) - parseFloat(sub.discount_value);

        const newPayment = await payment.create({
          subscription_id: sub.subscription_id,
          due_date: nextDueDate,
          amount_due: amountDue,
        });

        try {
          // 1. Busca dados do Usuário (para pegar nome e e-mail)
          // Precisamos garantir que temos o user_id. Se o objeto 'subscription' do loop já tiver, ótimo.
          const recipientUser = await userModel.findOneUser({
            id: sub.user_id,
          });
          // 2. Busca dados do Plano (para pegar o nome do plano)
          // Assumindo que subscription tem 'payment_plan_id'
          const planDetails = await paymentPlanModel.findById(sub.plan_id);

          // 3. Formata a data de vencimento
          const formattedDate = new Date(
            newPayment.due_date,
          ).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
          });

          // 4. Define link (pode ser a página de pagamentos do aluno)
          const baseUrl =
            process.env.NEXT_PUBLIC_WEB_URL || "https://rakusaitaiko.com.br";
          const link = `${baseUrl}/financeiro`;

          // 5. Dispara o E-mail
          await emailService.sendPaymentGeneratedEmail({
            to: recipientUser.email,
            username: recipientUser.username,
            planName: planDetails?.name || "Plano Rakusai",
            totalValue: sub.full_value || 0,
            discount: sub.discount_value || 0,
            finalValue: newPayment.amount_due || 0,
            dueDate: formattedDate,
            paymentLink: link,
          });
        } catch (emailError) {
          console.error(
            `[Erro Email] Falha ao notificar usuário ${subscription.user_id}:`,
            emailError.message,
          );
        }

        paymentsGenerated++;
      }
    }
  }

  return paymentsGenerated;
}

/**
 * Tarefa 2: Orquestra todas as tarefas diárias (overdue + generation)
 */
async function runDailyTasks() {
  console.log("Iniciando tarefas diárias...");

  // 1. Marca pagamentos como vencidos (função que você já tinha)
  const overdueResults = await payment.findAndSetOverdue();
  const overdueCount = overdueResults.length;
  console.log(
    `[Tarefas Diárias] ${overdueCount} pagamentos marcados como VENCIDOS.`,
  );

  // 2. Gera os próximos pagamentos
  const generatedCount = await generateNextPayments();
  console.log(`[Tarefas Diárias] ${generatedCount} novos pagamentos GERADOS.`);

  return {
    overdueUpdated: overdueCount,
    paymentsGenerated: generatedCount,
  };
}

export default {
  runDailyTasks,
  generateNextPayments,
};
