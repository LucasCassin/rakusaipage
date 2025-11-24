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

    // --- CORREÇÃO: "Trava" o tempo para testes que dependem do 'hoje' ---
    // Vamos definir "hoje" como 3 de Novembro de 2025.
    // A janela de geração será, portanto, até 13 de Novembro de 2025.
    jest.useFakeTimers().setSystemTime(new Date("2025-11-03T10:00:00Z"));
  });

  // Limpa os timers falsos depois de cada teste
  afterEach(() => {
    jest.useRealTimers();
  });

  describe("generateNextPayments()", () => {
    it("should generate a payment if the next due date is within 10 days", async () => {
      // 1. Cria a assinatura
      const sub = await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 5, // Dia 5
        start_date: "2025-01-01",
      });
      const firstPayment = (await payment.findByUserId(testUser.id))[0];

      // 2. Força o 1º pagamento para o passado (dia 5 do MÊS PASSADO)
      // "Hoje" é 3 de Nov. O mês passado é Outubro.
      const today = new Date(); // "Hoje" (fake) = 2025-11-03
      const lastDueDate = new Date(today.getFullYear(), today.getMonth(), 5);
      lastDueDate.setMonth(lastDueDate.getMonth() - 1); // 2025-10-05
      lastDueDate.setUTCHours(0, 0, 0, 0);

      // O próximo vencimento esperado é dia 5 DESTE mês
      const expectedNextDueDate = new Date(lastDueDate);
      expectedNextDueDate.setMonth(lastDueDate.getMonth() + 1); // 2025-11-05

      await database.query({
        text: "UPDATE payments SET due_date = $1 WHERE id = $2",
        values: [lastDueDate.toISOString().split("T")[0], firstPayment.id],
      });

      // 3. Executa a tarefa
      // "Hoje" (2025-11-03) a task roda.
      // A data limite é 2025-11-13.
      // O nextDueDate (2025-11-05) está DENTRO da janela.
      const generatedCount = await tasks.generateNextPayments();

      // 4. Verifica
      expect(generatedCount).toBe(1);
      const allPayments = await payment.findByUserId(testUser.id);
      expect(allPayments).toHaveLength(2); // O original + o novo
      const newPayment = allPayments.find((p) => p.id !== firstPayment.id);

      expect(new Date(newPayment.due_date)).toEqual(expectedNextDueDate);
    });

    it("should not generate a payment if the next due date is far away", async () => {
      // --- CORREÇÃO: Usa o Fake Timer para um setup determinístico ---
      // "Hoje" é 3 de Nov. A janela de geração é até 13 de Nov.
      // Vamos criar uma assinatura cujo *próximo* pagamento é 20 de Nov.

      // 1. Cria assinatura com data de início no mês passado e dia de pagto dia 20
      await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 20, // Dia 20
        start_date: "2025-10-01", // Mês passado
      });
      // O `subscription.create` vai gerar o primeiro pagamento,
      // com vencimento em 2025-11-20 (o próximo dia 20).

      // 2. Executa a tarefa
      // "Hoje" (2025-11-03) a task roda.
      // A data limite é 2025-11-13.
      // A task vai buscar a assinatura, ver que o MAX(due_date) é 2025-11-20.
      // Vai calcular o *próximo* vencimento: 2025-12-20.
      // 2025-12-20 está FORA da janela (que termina em 2025-11-13).
      const generatedCount = await tasks.generateNextPayments();

      // 3. Verifica
      expect(generatedCount).toBe(0);
      const allPayments = await payment.findByUserId(testUser.id);
      expect(allPayments).toHaveLength(1); // Apenas o original
    });

    it("should not generate a duplicate payment", async () => {
      // --- CORREÇÃO: Usa a mesma lógica robusta do primeiro teste ---
      // 1. Cria a assinatura
      const sub = await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 5, // Dia 5
        start_date: "2025-01-01",
      });
      const firstPayment = (await payment.findByUserId(testUser.id))[0];

      // 2. Força o 1º pagamento para o passado (dia 5 do MÊS PASSADO)
      const today = new Date(); // "Hoje" (fake) = 2025-11-03
      const lastDueDate = new Date(today.getFullYear(), today.getMonth(), 5);
      lastDueDate.setMonth(lastDueDate.getMonth() - 1); // 2025-10-05
      lastDueDate.setUTCHours(0, 0, 0, 0);

      await database.query({
        text: "UPDATE payments SET due_date = $1 WHERE id = $2",
        values: [lastDueDate.toISOString().split("T")[0], firstPayment.id],
      });

      // 3. Executa a tarefa DUAS VEZES
      // A primeira execução (2025-11-05) está na janela.
      const generatedCount1 = await tasks.generateNextPayments();
      // A segunda execução vai ver que 2025-11-05 já existe.
      const generatedCount2 = await tasks.generateNextPayments();

      // 4. Verifica
      expect(generatedCount1).toBe(1);
      expect(generatedCount2).toBe(0); // Não gerou duplicata
      const allPayments = await payment.findByUserId(testUser.id);
      expect(allPayments).toHaveLength(2); // Apenas 2 (original + 1 gerado)
    });
  });

  describe("runDailyTasks()", () => {
    it("should run both 'overdue' and 'generation' tasks", async () => {
      // "Hoje" é 2025-11-03

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
      // Força o status para PENDING (vamos assumir que `create` o deixa PENDING)
      // Se `create` o deixa PAID, esse update é necessário.
      await database.query({
        text: "UPDATE payments SET status = 'PENDING' WHERE id = $1",
        values: [overduePayment.id],
      });

      // 2. Pagamento a ser GERADO (para generateNextPayments)
      const subGenerate = await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 10, // Dia 10
        start_date: "2025-01-01", // Cria o pagamento 2 (due 2025-02-10)
      });
      const firstPaymentGen = (await payment.findByUserId(testUser.id)).find(
        (p) => p.subscription_id === subGenerate.id,
      );

      // --- CORREÇÃO: Lógica de setup robusta ---
      // Força o pagamento 2 para o passado (dia 10 do MÊS PASSADO)
      const today = new Date(); // "Hoje" (fake) = 2025-11-03
      const lastDueDate = new Date(today.getFullYear(), today.getMonth(), 10);
      lastDueDate.setMonth(lastDueDate.getMonth() - 1); // 2025-10-10
      lastDueDate.setUTCHours(0, 0, 0, 0);

      // Força o pagamento 2 para o passado e status PENDING
      await database.query({
        text: "UPDATE payments SET due_date = $1, status = 'PENDING' WHERE id = $2",
        values: [lastDueDate.toISOString().split("T")[0], firstPaymentGen.id],
      });

      // --- Execução ---
      // "Hoje" é 2025-11-03
      const summary = await tasks.runDailyTasks();

      // --- Verificação ---
      // findAndSetOverdue:
      // - Encontra overduePayment (due 2020-02-01, PENDING) -> Vira OVERDUE
      // - Encontra firstPaymentGen (due 2025-10-10, PENDING) -> Vira OVERDUE
      // Total: 2
      //
      // generateNextPayments:
      // - subOverdue: last_due_date = 2020-02-01. Next = 2020-03-01. (Dentro da janela) -> Gera 1
      // - subGenerate: last_due_date = 2025-10-10. Next = 2025-11-10. (Dentro da janela) -> Gera 1
      // Total: 2
      expect(summary).toEqual({
        overdueUpdated: 2,
        paymentsGenerated: 2,
      });

      // Verifica o pagamento vencido 1
      const checkedOverdue = await payment.findById(overduePayment.id);
      expect(checkedOverdue.status).toBe("OVERDUE");

      // Verifica o pagamento vencido 2
      const checkedOverdue2 = await payment.findById(firstPaymentGen.id);
      expect(checkedOverdue2.status).toBe("OVERDUE");

      // Verifica o pagamento gerado (para subGenerate)
      const allGenPayments = (await payment.findByUserId(testUser.id)).filter(
        (p) => p.subscription_id === subGenerate.id,
      );
      expect(allGenPayments).toHaveLength(2); // O original (agora OVERDUE) + o novo (GERADO)
    });
  });
});
