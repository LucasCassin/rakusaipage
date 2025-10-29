import orchestrator from "tests/orchestrator.js";
import plan from "models/payment_plan.js";
import user from "models/user.js";
import subscription from "models/subscription.js";
import { ValidationError } from "errors/index.js";

describe("Payment Plan Model", () => {
  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    // Movemos a limpeza para o beforeEach para isolar os testes
  });

  // Limpa a base ANTES de cada 'describe' para evitar conflitos
  beforeEach(async () => {
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
  });

  describe("create()", () => {
    // ... (testes do create permanecem iguais) ...
    it("should create a new payment plan with valid data", async () => {
      const planData = {
        name: "Plano Mensal Taiko",
        full_value: 150.0,
        period_unit: "month",
        period_value: 1,
      };
      const newPlan = await plan.create(planData);
      expect(newPlan.id).toBeDefined();
      expect(newPlan.name).toBe("Plano Mensal Taiko");
      expect(newPlan.full_value).toBe("150.00");
    });

    it("should throw ValidationError if required fields are missing", async () => {
      const planData = { name: "Plano Incompleto" };
      await expect(plan.create(planData)).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for invalid 'period_unit'", async () => {
      const planData = {
        name: "Plano Inválido",
        full_value: 100.0,
        period_unit: "invalid_unit",
        period_value: 1,
      };
      await expect(plan.create(planData)).rejects.toThrow(ValidationError);
    });
  });

  describe("find()", () => {
    // ... (testes do find permanecem iguais) ...
    let createdPlan;
    beforeEach(async () => {
      // Mudado para beforeEach
      createdPlan = await plan.create({
        name: "Plano de Teste Find",
        full_value: 99.99,
        period_unit: "week",
        period_value: 2,
      });
    });

    it("should find a plan by its ID", async () => {
      const foundPlan = await plan.findById(createdPlan.id);
      expect(foundPlan.id).toBe(createdPlan.id);
    });

    it("should return all plans with findAll", async () => {
      const allPlans = await plan.findAll();
      expect(Array.isArray(allPlans)).toBe(true);
      expect(allPlans.length).toBeGreaterThan(0); // Pelo menos o beforeEach criou um
    });
  });

  describe("update()", () => {
    // ... (testes do update permanecem iguais) ...
    it("should update an existing plan's data", async () => {
      const originalPlan = await plan.create({
        name: "Plano Original",
        full_value: 50.0,
        period_unit: "day",
        period_value: 15,
      });
      const updatedPlan = await plan.update(originalPlan.id, {
        name: "Plano Atualizado",
        full_value: 55.5,
      });
      expect(updatedPlan.id).toBe(originalPlan.id);
      expect(updatedPlan.name).toBe("Plano Atualizado");
      expect(updatedPlan.full_value).toBe("55.50");
    });

    it("should throw a ValidationError when updating with invalid data", async () => {
      const originalPlan = await plan.create({
        name: "Plano para Update Inválido",
        full_value: 10.0,
        period_unit: "month",
        period_value: 1,
      });
      await expect(
        plan.update(originalPlan.id, { period_value: -5 }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("del()", () => {
    // ... (testes do del permanecem iguais) ...
    it("should delete a plan that is not in use", async () => {
      const planToDelete = await plan.create({
        name: "Plano Temporário",
        full_value: 10,
        period_unit: "day",
        period_value: 1,
      });

      await plan.del(planToDelete.id);

      const foundPlan = await plan.findById(planToDelete.id);
      expect(foundPlan).toBeUndefined();
    });

    it("should throw an error when trying to delete a plan that is in use", async () => {
      const testUser = await user.create({
        username: "userWithSub",
        email: "sub@test.com",
        password: "StrongPassword123@",
      });
      const planInUse = await plan.create({
        name: "Plano em Uso",
        full_value: 10,
        period_unit: "month",
        period_value: 1,
      });
      await subscription.create({
        user_id: testUser.id,
        plan_id: planInUse.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });

      // A deleção vai falhar por causa da Foreign Key constraint com ON DELETE RESTRICT
      await expect(plan.del(planInUse.id)).rejects.toThrow();
    });
  });

  // --- NOVO BLOCO DE TESTES ---
  describe("findActiveSubscriptionCount()", () => {
    let testPlan;
    let user1, user2, user3;

    beforeEach(async () => {
      // Cria dados frescos para cada teste de contagem
      testPlan = await plan.create({
        name: "Plano para Contagem",
        full_value: 100,
        period_unit: "month",
        period_value: 1,
      });

      user1 = await user.create({
        username: "userCount1",
        email: "count1@test.com",
        password: "StrongPassword123@",
      });
      user2 = await user.create({
        username: "userCount2",
        email: "count2@test.com",
        password: "StrongPassword123@",
      });
      user3 = await user.create({
        username: "userCount3",
        email: "count3@test.com",
        password: "StrongPassword123@",
      });
    });

    it("should return the correct count of active subscriptions", async () => {
      // Assinatura 1 (ativa)
      await subscription.create({
        user_id: user1.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      // Assinatura 2 (ativa)
      await subscription.create({
        user_id: user2.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      // Assinatura 3 (inativa)
      const subInactive = await subscription.create({
        user_id: user3.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      await subscription.update(subInactive.id, { is_active: false });

      const count = await plan.findActiveSubscriptionCount(testPlan.id);
      expect(count).toBe(2);
    });

    it("should return 0 if there are no active subscriptions for the plan", async () => {
      // Cria apenas uma assinatura inativa
      const subInactive = await subscription.create({
        user_id: user1.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      await subscription.update(subInactive.id, { is_active: false });

      const count = await plan.findActiveSubscriptionCount(testPlan.id);
      expect(count).toBe(0);
    });

    it("should return 0 if the plan exists but has no subscriptions", async () => {
      const count = await plan.findActiveSubscriptionCount(testPlan.id);
      expect(count).toBe(0);
    });

    it("should throw ValidationError if the planId is invalid", async () => {
      await expect(
        plan.findActiveSubscriptionCount("invalid-uuid"),
      ).rejects.toThrow(ValidationError);
    });
  });
  // --- FIM DO NOVO BLOCO ---
});
