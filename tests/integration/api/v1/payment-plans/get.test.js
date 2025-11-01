import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";

describe("GET /api/v1/payment-plans", () => {
  let adminUser, regularUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
    adminUser = await user.findOneUser({ username: "mainUser" });
    regularUser = await user.create({
      username: "regularGetUser",
      email: "regularget@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await plan.create({
      name: "Plano de Teste GET",
      full_value: 10,
      period_unit: "day",
      period_value: 1,
    });
  });

  it("should return a list of payment plans for an admin user", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(resBody)).toBe(true);
    expect(resBody.length).toBeGreaterThan(0);
  });

  it("should return 403 Forbidden for a regular user", async () => {
    const newSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    expect(res.status).toBe(403);
  });
});
