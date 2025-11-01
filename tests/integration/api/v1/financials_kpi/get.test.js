import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";
import payment from "models/payment.js";
import database from "infra/database.js";

describe("GET /api/v1/financials_kpi", () => {
  let adminUser, regularUser, testPlan;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword1T@",
    });
    await user.addFeatures(adminUser, [
      "read:payment:other",
      "read:subscription:other",
    ]);

    regularUser = await user.create({
      username: "kpiUser",
      email: "kpi@test.com",
      password: "StrongPassword1T@",
    });

    testPlan = await plan.create({
      name: "Plano para KPI Test",
      full_value: 150,
      period_unit: "month",
      period_value: 1,
    });

    // Cria um pagamento PENDENTE em Março de 2030
    const subPending = await subscription.create({
      user_id: regularUser.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2030-02-01",
    });
    const paymentPending = (await payment.findByUserId(regularUser.id)).find(
      (p) => p.subscription_id === subPending.id,
    );
    await database.query({
      text: "UPDATE payments SET due_date = $1 WHERE id = $2",
      values: ["2030-03-10", paymentPending.id],
    });
  });

  it("should return 200 and default (current month) KPIs for admin", async () => {
    // (Este teste permanece o mesmo e está correto)
    const adminSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/financials_kpi`,
      {
        headers: { cookie: `session_id=${adminSession.token}` },
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.pendingThisMonth).toBe(0); // Dados estão em 2030
  });

  it("should return 200 and filtered KPIs when startDate/endDate are provided", async () => {
    // --- TESTE ATUALIZADO ---
    const adminSession = await session.create(adminUser);
    const res = await fetch(
      // Atualiza a query string de ?year&month para ?startDate&endDate
      `${orchestrator.webserverUrl}/api/v1/financials_kpi?startDate=2030-03-01&endDate=2030-03-31`,
      {
        headers: { cookie: `session_id=${adminSession.token}` },
      },
    );
    const resBody = await res.json();

    expect(res.status).toBe(200);
    // Deve encontrar o pagamento de 150 pendente que criamos em "2030-03-10"
    expect(resBody.pendingThisMonth).toBe(150.0);
    expect(resBody.revenueThisMonth).toBe(0);
  });

  it("should return 0 if the range is wrong", async () => {
    // Teste extra para garantir que o filtro funciona
    const adminSession = await session.create(adminUser);
    const res = await fetch(
      // Pega um mês diferente (Abril)
      `${orchestrator.webserverUrl}/api/v1/financials_kpi?startDate=2030-04-01&endDate=2030-04-30`,
      {
        headers: { cookie: `session_id=${adminSession.token}` },
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    // Não deve encontrar o pagamento de Março
    expect(resBody.pendingThisMonth).toBe(0);
  });

  it("should return 403 for a regular user", async () => {
    // (Este teste permanece o mesmo)
    const newSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/financials_kpi`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(403);
  });

  it("should return 403 for an anonymous user (no cookie)", async () => {
    // (Este teste permanece o mesmo)
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/financials_kpi`,
    );
    // (Retorna 403 pois falha no 'canRequest' antes de checar se é anônimo)
    expect(res.status).toBe(403);
  });

  it("should return 405 Method Not Allowed for POST", async () => {
    // (Este teste permanece o mesmo)
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/financials_kpi`,
      {
        method: "POST",
      },
    );
    expect(res.status).toBe(405);
  });
});
