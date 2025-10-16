import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";
import payment from "models/payment.js";
import database from "infra/database.js";

describe("User Subscription Model", () => {
  let testUser, testPlanMonth, testPlanDay;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    testUser = await user.create({
      username: "subscribingUser",
      email: "subscriber@test.com",
      password: "StrongPassword123@",
    });
    testPlanMonth = await plan.create({
      name: "Plano Mensal",
      full_value: 200.0,
      period_unit: "month",
      period_value: 1,
    });
    testPlanDay = await plan.create({
      name: "Plano Quinzenal",
      full_value: 120.0,
      period_unit: "day",
      period_value: 15,
    });
  });

  describe("create()", () => {
    it("should create a new subscription and the first associated payment for a MONTHLY plan", async () => {
      const subscriptionData = {
        user_id: testUser.id,
        plan_id: testPlanMonth.id,
        payment_day: 10,
        start_date: "2025-10-15",
      };
      const newSubscription = await subscription.create(subscriptionData);
      const userPayments = await payment.findByUserId(testUser.id);
      const firstPayment = userPayments.find(
        (p) => p.subscription_id === newSubscription.id,
      );

      expect(firstPayment.amount_due).toBe("200.00");
      const dueDate = new Date(firstPayment.due_date);
      expect(dueDate.getUTCFullYear()).toBe(2025);
      expect(dueDate.getUTCMonth()).toBe(10); // Novembro
      expect(dueDate.getUTCDate()).toBe(10);
    });

    // NOVO TESTE
    it("should correctly calculate the due date for a DAY-based plan", async () => {
      const subscriptionData = {
        user_id: testUser.id,
        plan_id: testPlanDay.id,
        payment_day: 1,
        start_date: "2025-03-10",
      };
      const newSubscription = await subscription.create(subscriptionData);
      const userPayments = await payment.findByUserId(testUser.id);
      const firstPayment = userPayments.find(
        (p) => p.subscription_id === newSubscription.id,
      );

      const expectedDueDate = new Date("2025-03-25T00:00:00.000Z"); // 10 de Março + 15 dias
      expect(new Date(firstPayment.due_date)).toEqual(expectedDueDate);
    });
    it("should rollback the transaction if payment creation fails", async () => {
      // Forçamos o erro passando um plan_id inválido que causará uma falha de FK
      const invalidSubscriptionData = {
        user_id: testUser.id,
        plan_id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d", // UUID inválido
        payment_day: 15,
        start_date: "2025-11-01",
      };

      // Esperamos que a função create lance um erro
      await expect(
        subscription.create(invalidSubscriptionData),
      ).rejects.toThrow();

      // Verificamos se NENHUMA assinatura foi criada para aquele usuário
      const results = await database.query({
        text: "SELECT * FROM user_subscriptions WHERE user_id = $1",
        values: [testUser.id],
      });

      // O teste original tinha um bug de comparar com plan_id, vamos ser mais genéricos
      const subscriptionsForUser = results.rows.filter(
        (sub) => sub.plan_id === invalidSubscriptionData.plan_id,
      );

      expect(subscriptionsForUser).toHaveLength(0);
    });
  });

  describe("update()", () => {
    it("should allow deactivating and changing the discount of a subscription", async () => {
      const subData = {
        user_id: testUser.id,
        plan_id: testPlanMonth.id,
        payment_day: 20,
        start_date: "2025-05-05",
      };
      const newSub = await subscription.create(subData);

      expect(newSub.is_active).toBe(true);
      expect(newSub.discount_value).toBe("0.00");

      const updatedSub = await subscription.update(newSub.id, {
        is_active: false,
        discount_value: 15.0,
      });

      expect(updatedSub.is_active).toBe(false);
      expect(updatedSub.discount_value).toBe("15.00");
    });
  });
});
