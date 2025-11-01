import orchestrator from "tests/orchestrator.js";
import tasks from "models/tasks.js";
import user from "models/user.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";
import payment from "models/payment.js";
import database from "infra/database.js";

describe("Tasks Model", () => {
  let testUser, testPlan;

  beforeEach(async () => {
    // Limpa a base antes de cada teste para isolar os cenários
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    testUser = await user.create({
      username: "taskUser",
      email: "task@test.com",
      password: "StrongPassword123@",
    });

    testPlan = await plan.create({
      name: "Plano Mensal",
      full_value: 100.0,
      period_unit: "month",
      period_value: 1,
    });
  });

  describe("generateNextPayments()", () => {
    it("should generate a payment if the next due date is within 10 days", async () => {
      // 1. Cria a assinatura
      const sub = await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 5, // <-- CORREÇÃO 1: Mudado de 10 para 5
        start_date: "2025-01-01",
      });
      const firstPayment = (await payment.findByUserId(testUser.id))[0];

      // 2. Força o 1º pagamento para o passado
      const today = new Date(); // Ex: 2025-10-30
      const nextDueDate = new Date();
      nextDueDate.setDate(today.getDate() + 5); // Ex: 2025-11-05
      nextDueDate.setUTCHours(0, 0, 0, 0);

      const lastDueDate = new Date(nextDueDate);
      lastDueDate.setMonth(lastDueDate.getMonth() - 1); // Ex: 2025-10-05

      await database.query({
        text: "UPDATE payments SET due_date = $1 WHERE id = $2",
        values: [lastDueDate.toISOString().split("T")[0], firstPayment.id],
      });

      // 3. Executa a tarefa
      const generatedCount = await tasks.generateNextPayments();

      // 4. Verifica
      expect(generatedCount).toBe(1);
      const allPayments = await payment.findByUserId(testUser.id);
      expect(allPayments).toHaveLength(2); // O original + o novo
      const newPayment = allPayments.find((p) => p.id !== firstPayment.id);

      // Agora o 'calculateNextDueDate' (com lastDueDate=Oct 5, payment_day=5)
      // vai (corretamente) calcular Nov 5.
      expect(new Date(newPayment.due_date)).toEqual(nextDueDate);
    });

    it("should not generate a payment if the next due date is far away", async () => {
      // (Este teste já estava passando e permanece o mesmo)
      await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 10,
        start_date: new Date().toISOString().split("T")[0],
      });
      const generatedCount = await tasks.generateNextPayments();
      expect(generatedCount).toBe(0);
      const allPayments = await payment.findByUserId(testUser.id);
      expect(allPayments).toHaveLength(1);
    });

    it("should not generate a duplicate payment", async () => {
      // (Este teste já estava passando, mas precisa da mesma correção do payment_day)
      const sub = await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 5, // <-- CORREÇÃO 1 (para consistência)
        start_date: "2025-01-01",
      });
      const firstPayment = (await payment.findByUserId(testUser.id))[0];
      const today = new Date();
      const nextDueDate = new Date();
      nextDueDate.setDate(today.getDate() + 5);
      const lastDueDate = new Date(nextDueDate);
      lastDueDate.setMonth(lastDueDate.getMonth() - 1);
      await database.query({
        text: "UPDATE payments SET due_date = $1 WHERE id = $2",
        values: [lastDueDate.toISOString().split("T")[0], firstPayment.id],
      });

      const generatedCount1 = await tasks.generateNextPayments();
      const generatedCount2 = await tasks.generateNextPayments();

      expect(generatedCount1).toBe(1);
      expect(generatedCount2).toBe(0);
      const allPayments = await payment.findByUserId(testUser.id);
      expect(allPayments).toHaveLength(2);
    });
  });

  describe("runDailyTasks()", () => {
    it("should run both 'overdue' and 'generation' tasks", async () => {
      // --- Setup (Cenário Combinado) ---

      // 1. Pagamento VENCIDO (para findAndSetOverdue)
      const subOverdue = await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2020-01-01", // Cria o pagamento 1 (due 2020-02-01)
      });
      const overduePayment = (await payment.findByUserId(testUser.id)).find(
        (p) => p.subscription_id === subOverdue.id,
      );
      await database.query({
        text: "UPDATE payments SET status = 'PENDING' WHERE id = $1",
        values: [overduePayment.id],
      });

      // 2. Pagamento a ser GERADO (para generateNextPayments)
      const subGenerate = await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 10,
        start_date: "2025-01-01", // Cria o pagamento 2 (due 2025-02-10)
      });
      const firstPaymentGen = (await payment.findByUserId(testUser.id)).find(
        (p) => p.subscription_id === subGenerate.id,
      );
      const today = new Date();
      const nextDueDate = new Date();
      nextDueDate.setDate(today.getDate() + 3);
      const lastDueDate = new Date(nextDueDate);
      lastDueDate.setMonth(lastDueDate.getMonth() - 1);
      // Força o pagamento 2 para o passado
      await database.query({
        text: "UPDATE payments SET due_date = $1 WHERE id = $2",
        values: [lastDueDate.toISOString().split("T")[0], firstPaymentGen.id],
      });

      // --- Execução ---
      const summary = await tasks.runDailyTasks();

      // --- Verificação (CORREÇÃO 2) ---
      // findAndSetOverdue encontra 2 pagamentos (overduePayment e firstPaymentGen)
      // generateNextPayments encontra 2 assinaturas (subOverdue e subGenerate)
      expect(summary).toEqual({
        overdueUpdated: 2,
        paymentsGenerated: 2,
      });

      // Verifica o pagamento vencido
      const checkedOverdue = await payment.findById(overduePayment.id);
      expect(checkedOverdue.status).toBe("OVERDUE");

      // Verifica o pagamento gerado
      const allGenPayments = (await payment.findByUserId(testUser.id)).filter(
        (p) => p.subscription_id === subGenerate.id,
      );
      expect(allGenPayments).toHaveLength(2);
    });
  });
});
