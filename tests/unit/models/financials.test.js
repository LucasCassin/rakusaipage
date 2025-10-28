import orchestrator from "tests/orchestrator.js";
import financials from "models/financials.js";
import user from "models/user.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";
import payment from "models/payment.js";
import database from "infra/database.js"; // Usado para forçar datas

describe("Financials Model", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
  });

  describe("getDashboardKPIs()", () => {
    beforeEach(async () => {
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
    });

    it("should return all zeros when there is no data", async () => {
      const kpis = await financials.getDashboardKPIs();

      expect(kpis).toEqual({
        activeStudents: 0,
        revenueThisMonth: 0,
        pendingThisMonth: 0,
        awaitingConfirmation: 0,
      });
    });

    it("should correctly calculate all KPIs in a complex scenario", async () => {
      // --- Setup ---
      // 3 Usuários
      const userA = await user.create({
        username: "userA",
        email: "a@test.com",
        password: "StrongPassword123@",
      });
      const userB = await user.create({
        username: "userB",
        email: "b@test.com",
        password: "StrongPassword123@",
      });
      const userC = await user.create({
        username: "userC",
        email: "c@test.com",
        password: "StrongPassword123@",
      });

      // 2 Planos
      const plan100 = await plan.create({
        name: "Plano 100",
        full_value: 100,
        period_unit: "month",
        period_value: 1,
      });
      const plan50 = await plan.create({
        name: "Plano 50",
        full_value: 50,
        period_unit: "month",
        period_value: 1,
      });

      // --- KPI: activeStudents (Expect: 2) ---
      await subscription.create({
        user_id: userA.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      await subscription.create({
        user_id: userB.id,
        plan_id: plan50.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      await subscription.create({
        user_id: userB.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      const subC = await subscription.create({
        user_id: userC.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      await subscription.update(subC.id, { is_active: false });

      // --- KPI: revenueThisMonth (Expect: 100.00) ---
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

      // --- KPI: awaitingConfirmation (Expect: 2) ---
      const subAwait1 = await subscription.create({
        user_id: userA.id,
        plan_id: plan50.id,
        payment_day: 1,
        start_date: "2025-06-01",
      });
      const paymentAwait1 = (await payment.findByUserId(userA.id)).find(
        (p) => p.subscription_id === subAwait1.id,
      );
      await payment.userIndicatePaid(paymentAwait1.id, userA.id);
      // **CORREÇÃO BUG OCULTO 1:** Força o vencimento para este mês
      await database.query({
        text: `UPDATE payments SET due_date = date_trunc('month', CURRENT_DATE) + interval '3 days' WHERE id = $1`,
        values: [paymentAwait1.id],
      });

      const subAwait2 = await subscription.create({
        user_id: userB.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-06-02",
      });
      const paymentAwait2 = (await payment.findByUserId(userB.id)).find(
        (p) => p.subscription_id === subAwait2.id,
      );
      await payment.userIndicatePaid(paymentAwait2.id, userB.id);
      // **CORREÇÃO BUG OCULTO 2:** Força o vencimento para este mês
      await database.query({
        text: `UPDATE payments SET due_date = date_trunc('month', CURRENT_DATE) + interval '4 days' WHERE id = $1`,
        values: [paymentAwait2.id],
      });

      // --- KPI: pendingThisMonth (Expect: 300.00) ---
      const subPending = await subscription.create({
        user_id: userC.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2025-07-01",
      });
      // **CORREÇÃO BUG 1:** Impede userC de se tornar ativo
      await subscription.update(subPending.id, { is_active: false });
      const paymentPending = (await payment.findByUserId(userC.id)).find(
        (p) => p.subscription_id === subPending.id,
      );
      await database.query({
        text: `UPDATE payments SET due_date = date_trunc('month', CURRENT_DATE) + interval '5 days' WHERE id = $1`,
        values: [paymentPending.id],
      });

      const subOverdue = await subscription.create({
        user_id: userC.id,
        plan_id: plan50.id,
        payment_day: 1,
        start_date: "2025-08-01",
      });
      // **CORREÇÃO BUG 2:** Impede userC de se tornar ativo
      await subscription.update(subOverdue.id, { is_active: false });
      const paymentOverdue = (await payment.findByUserId(userC.id)).find(
        (p) => p.subscription_id === subOverdue.id,
      );
      await database.query({
        text: `UPDATE payments SET due_date = date_trunc('month', CURRENT_DATE) + interval '1 day' WHERE id = $1`,
        values: [paymentOverdue.id],
      });

      const subOld = await subscription.create({
        user_id: userC.id,
        plan_id: plan100.id,
        payment_day: 1,
        start_date: "2024-01-01",
      });
      // **CORREÇÃO BUG 3:** Impede userC de se tornar ativo
      await subscription.update(subOld.id, { is_active: false });
      const paymentOld = (await payment.findByUserId(userC.id)).find(
        (p) => p.subscription_id === subOld.id,
      );
      await database.query({
        text: `UPDATE payments SET due_date = date_trunc('month', CURRENT_DATE) - interval '1 month' WHERE id = $1`,
        values: [paymentOld.id],
      });

      // --- Execução ---
      const kpis = await financials.getDashboardKPIs();

      // --- Verificação ---
      // activeStudents: UserA, UserB = 2
      expect(kpis.activeStudents).toBe(2);
      // revenueThisMonth: paymentRevenue = 100.00
      expect(kpis.revenueThisMonth).toBe(100.0);
      // awaitingConfirmation: paymentAwait1, paymentAwait2 = 2
      expect(kpis.awaitingConfirmation).toBe(2);
      // pendingThisMonth: paymentAwait1(50) + paymentAwait2(100) + paymentPending(100) + paymentOverdue(50) = 300.00
      expect(kpis.pendingThisMonth).toBe(300.0);
    });
  });
});
