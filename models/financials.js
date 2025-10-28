import database from "infra/database.js";

/**
 * Busca os dados agregados (KPIs) para o dashboard financeiro.
 * Executa todas as consultas de agregação em paralelo.
 */
async function getDashboardKPIs() {
  // Query 1: Contagem de alunos únicos com assinaturas ativas
  const activeStudentsQuery = `
    SELECT COUNT(DISTINCT user_id) as value 
    FROM user_subscriptions 
    WHERE is_active = true;
  `;

  // Query 2: Receita confirmada este mês (baseado na data de confirmação)
  const revenueThisMonthQuery = `
    SELECT COALESCE(SUM(amount_due), 0) as value 
    FROM payments 
    WHERE status = 'CONFIRMED' 
      AND confirmed_at >= date_trunc('month', CURRENT_TIMESTAMP) 
      AND confirmed_at < date_trunc('month', CURRENT_TIMESTAMP) + interval '1 month';
  `;

  // Query 3: Total pendente/atrasado com vencimento este mês
  const pendingThisMonthQuery = `
    SELECT COALESCE(SUM(amount_due), 0) as value 
    FROM payments 
    WHERE status IN ('PENDING', 'OVERDUE') 
      AND due_date >= date_trunc('month', CURRENT_DATE) 
      AND due_date < date_trunc('month', CURRENT_DATE) + interval '1 month';
  `;

  // Query 4: Contagem de pagamentos aguardando confirmação (usuário avisou)
  const awaitingConfirmationQuery = `
    SELECT COUNT(*) as value 
    FROM payments 
    WHERE status = 'PENDING' 
      AND user_notified_payment = true;
  `;

  try {
    // Executa todas as queries em paralelo
    const [
      activeStudentsResult,
      revenueThisMonthResult,
      pendingThisMonthResult,
      awaitingConfirmationResult,
    ] = await Promise.all([
      database.query(activeStudentsQuery),
      database.query(revenueThisMonthQuery),
      database.query(pendingThisMonthQuery),
      database.query(awaitingConfirmationQuery),
    ]);

    // Extrai os valores brutos
    // Usamos COALESCE(SUM(...), 0) nas queries de soma para garantir que retorne 0 em vez de NULL
    const activeStudents = Number(activeStudentsResult.rows[0].value);
    const revenueThisMonth = parseFloat(revenueThisMonthResult.rows[0].value);
    const pendingThisMonth = parseFloat(pendingThisMonthResult.rows[0].value);
    const awaitingConfirmation = Number(
      awaitingConfirmationResult.rows[0].value,
    );

    // Retorna os dados brutos. O frontend será responsável pela formatação (ex: "R$ 2.150,00")
    return {
      activeStudents,
      revenueThisMonth,
      pendingThisMonth,
      awaitingConfirmation,
    };
  } catch (error) {
    console.error("Erro ao buscar KPIs do dashboard no modelo:", error);
    throw error; // Propaga o erro para o controller da API
  }
}

export default {
  getDashboardKPIs,
};
