import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("GET /api/v1/financials_kpi", () => {
  let adminUser, regularUser, testPlan;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Encontra o usuário admin padrão (criado pelas migrações)
    // e atualiza a senha para que possamos usá-lo
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    // Cria um usuário regular (sem permissões de admin)
    regularUser = await user.create({
      username: "regularUser",
      email: "regular@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    // Cria alguns dados para que os KPIs não sejam zero
    testPlan = await plan.create({
      name: "Plano para KPI Test",
      full_value: 100,
      period_unit: "month",
      period_value: 1,
    });
    // Cria uma assinatura ativa
    await subscription.create({
      user_id: regularUser.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
  });

  it("should allow an admin to get the KPI data", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/financials_kpi`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    const resBody = await res.json();

    expect(res.status).toBe(200);
    // Verifica se a estrutura básica dos KPIs está presente
    expect(resBody).toHaveProperty("activeStudents");
    expect(resBody).toHaveProperty("revenueThisMonth");
    expect(resBody).toHaveProperty("pendingThisMonth");
    expect(resBody).toHaveProperty("awaitingConfirmation");
    // Verifica se o KPI foi calculado com base no beforeAll
    expect(resBody.activeStudents).toBe(1);
  });

  it("should return 403 for a regular user", async () => {
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
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/financials_kpi`,
    );
    expect(res.status).toBe(403);
  });
});
