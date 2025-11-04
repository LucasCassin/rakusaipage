import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("GET /api/v1/payment-plans/[id]/stats", () => {
  let adminUser, regularUser, testPlan;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Cria admin e usuário regular
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    regularUser = await user.create({
      username: "regularStatsUser",
      email: "stats@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    // Cria o plano de teste
    testPlan = await plan.create({
      name: "Plano para Stats Test",
      full_value: 100,
      period_unit: "month",
      period_value: 1,
    });

    // Cria assinaturas: 2 ativas, 1 inativa para o plano
    await subscription.create({
      user_id: regularUser.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
    const userA = await user.create({
      username: "userStatsA",
      email: "stats_a@test.com",
      password: "StrongPassword123@",
    });
    await subscription.create({
      user_id: userA.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
    const userB = await user.create({
      username: "userStatsB",
      email: "stats_b@test.com",
      password: "StrongPassword123@",
    });
    const subInactive = await subscription.create({
      user_id: userB.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
    await subscription.update(subInactive.id, { is_active: false });
  });

  it("should allow an admin to get the stats for a plan", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${testPlan.id}/stats`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    const resBody = await res.json();

    expect(res.status).toBe(200);
    expect(resBody).toEqual({
      plan_id: testPlan.id,
      activeSubscriptions: 2, // Espera 2 assinaturas ativas
      totalSubscriptions: 3, // Espera 3 assinaturas totais
    });
  });

  it("should return 403 for a regular user trying to get stats", async () => {
    const newSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${testPlan.id}/stats`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(403);
  });

  it("should return 403 for an anonymous user (no cookie)", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${testPlan.id}/stats`,
    );
    expect(res.status).toBe(403);
  });

  it("should return 404 if the plan ID does not exist", async () => {
    const newSession = await session.create(adminUser);
    const nonExistentId = orchestrator.generateRandomUUIDV4();
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${nonExistentId}/stats`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(404);
  });

  it("should return 405 Method Not Allowed for POST", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${testPlan.id}/stats`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "fail" }),
      },
    );
    expect(res.status).toBe(405);
  });
});
