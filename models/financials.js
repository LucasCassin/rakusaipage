import database from "infra/database.js";

/**
 * Busca os dados agregados (KPIs) para o dashboard financeiro.
 * Agora aceita parâmetros de data de início e fim.
 */
async function getDashboardKPIs(startDateString, endDateString) {
  let startDate, endDate;

  if (startDateString && endDateString) {
    // Usa as datas fornecidas
    startDate = new Date(startDateString);
    // Adiciona 1 dia ao endDate para que a consulta SQL (usando '<')
    // inclua o dia final inteiro.
    const tempEnd = new Date(endDateString);
    endDate = new Date(tempEnd.setDate(tempEnd.getDate() + 1));
  } else {
    // Padrão: usa o mês atual
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    startDate = new Date(Date.UTC(year, month, 1));
    endDate = new Date(Date.UTC(year, month + 1, 1));
  }

  // --- QUERIES (Permanecem as mesmas) ---
  const activeStudentsQuery = `
    SELECT COUNT(DISTINCT user_id) as value 
    FROM user_subscriptions 
    WHERE is_active = true;
  `;
  const revenueThisMonthQuery = `
    SELECT COALESCE(SUM(amount_due), 0) as value 
    FROM payments 
    WHERE status = 'CONFIRMED' 
      AND confirmed_at >= $1 
      AND confirmed_at < $2;
  `;
  const pendingThisMonthQuery = `
    SELECT COALESCE(SUM(amount_due), 0) as value 
    FROM payments 
    WHERE status IN ('PENDING', 'OVERDUE') 
      AND due_date >= $1 
      AND due_date < $2;
  `;
  const awaitingConfirmationQuery = `
    SELECT COUNT(*) as value 
    FROM payments 
    WHERE status = 'PENDING' 
      AND user_notified_payment = true;
  `;

  try {
    const [
      activeStudentsResult,
      revenueThisMonthResult,
      pendingThisMonthResult,
      awaitingConfirmationResult,
    ] = await Promise.all([
      database.query({ text: activeStudentsQuery }),
      database.query({
        text: revenueThisMonthQuery,
        values: [startDate, endDate],
      }),
      database.query({
        text: pendingThisMonthQuery,
        values: [startDate, endDate],
      }),
      database.query({ text: awaitingConfirmationQuery }),
    ]);

    // ... (Extração de resultados permanece a mesma)
    const activeStudents = Number(activeStudentsResult.rows[0].value);
    const revenueThisMonth = parseFloat(revenueThisMonthResult.rows[0].value);
    const pendingThisMonth = parseFloat(pendingThisMonthResult.rows[0].value);
    const awaitingConfirmation = Number(
      awaitingConfirmationResult.rows[0].value,
    );

    return {
      activeStudents,
      revenueThisMonth,
      pendingThisMonth,
      awaitingConfirmation,
    };
  } catch (error) {
    console.error("Erro ao buscar KPIs do dashboard no modelo:", error);
    throw error;
  }
}

export default {
  getDashboardKPIs,
};
