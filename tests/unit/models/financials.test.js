import orchestrator from "tests/orchestrator.js";
import financials from "models/financials.js";
import user from "models/user.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";
import payment from "models/payment.js";
import database from "infra/database.js";

describe("Financials Model", () => {
  beforeEach(async () => {
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
  });

  describe("getDashboardKPIs()", () => {
    it("should return defaults (0 for time-sensitive) when no data exists for the current month", async () => {
      // (Este teste já estava passando e está correto)
      const testUser = await user.create({
        username: "userA",
        email: "a@test.com",
        password: "StrongPassword123@",
      });
      const testPlan = await plan.create({
        name: "Plano 100",
        full_value: 100,
        period_unit: "month",
        period_value: 1,
      });
      await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });

      const kpis = await financials.getDashboardKPIs();

      expect(kpis.activeStudents).toBe(1);
      expect(kpis.awaitingConfirmation).toBe(0);
      expect(kpis.revenueThisMonth).toBe(0);
      expect(kpis.pendingThisMonth).toBe(0);
    });

    it("should correctly filter KPIs by a specific date range", async () => {
      // --- Setup ---
      const startDateString = "2030-03-01";
      const endDateString = "2030-03-31";
      const targetStartDate = "2030-03-05T12:00:00Z";
      const targetEndDate = "2030-03-15T12:00:00Z";
      const oldDate = "2030-02-10T12:00:00Z";

      // --- CORREÇÃO (Linha 54) ---
      // Remove o underscore '_' do username
      const userA = await user.create({
        username: "userAkpi", // Nome de usuário alfanumérico
        email: "a_kpi@test.com", // E-mail pode ter '_'
        password: "StrongPassword123@",
      });
      const userB = await user.create({
        username: "userBkpi", // Nome de usuário alfanumérico
        email: "b_kpi@test.com",
        password: "StrongPassword123@",
      });
      // --- FIM DA CORREÇÃO ---

      const plan100 = await plan.create({
        name: "Plano 100",
        full_value: 100,
        period_unit: "month",
        period_value: 1,
      });

      // (O resto da lógica de criação de dados permanece o mesmo)
      await subscription.create({
        user_id: userA.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      await subscription.create({
        user_id: userB.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      const subAwait = await subscription.create({
        user_id: userA.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-06-01",
      });
      const paymentAwait = (await payment.findByUserId(userA.id)).find(
        (p) => p.subscription_id === subAwait.id,
      );
      await payment.userIndicatePaid(paymentAwait.id, userA.id);
      const subRevenue = await subscription.create({
        user_id: userA.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-05-05",
      });
      const paymentRevenue = (await payment.findByUserId(userA.id)).find(
        (p) => p.subscription_id === subRevenue.id,
      );
      await payment.adminConfirmPaid(paymentRevenue.id);
      await database.query({
        text: `UPDATE payments SET confirmed_at = $1 WHERE id = $2`,
        values: [targetStartDate, paymentRevenue.id],
      });
      const subPending = await subscription.create({
        user_id: userB.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-07-01",
      });
      const paymentPending = (await payment.findByUserId(userB.id)).find(
        (p) => p.subscription_id === subPending.id,
      );
      await database.query({
        text: `UPDATE payments SET due_date = $1 WHERE id = $2`,
        values: [targetEndDate, paymentPending.id],
      });
      const subOld = await subscription.create({
        user_id: userB.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-08-01",
      });
      const paymentOld = (await payment.findByUserId(userB.id)).find(
        (p) => p.subscription_id === subOld.id,
      );
      await database.query({
        text: `UPDATE payments SET due_date = $1 WHERE id = $2`,
        values: [oldDate, paymentOld.id],
      });

      // --- Execução ---
      const kpis = await financials.getDashboardKPIs(
        startDateString,
        endDateString,
      );

      // --- Verificação ---
      expect(kpis.activeStudents).toBe(2);
      expect(kpis.awaitingConfirmation).toBe(1);
      expect(kpis.revenueThisMonth).toBe(100.0);
      expect(kpis.pendingThisMonth).toBe(100.0);
    });
  });
});
