import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";

describe("GET /api/v1/payment-plans/[id]", () => {
  let adminUser, regularUser, testPlan;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
    adminUser = await user.findOneUser({ username: "mainUser" });
    regularUser = await user.create({
      username: "regularIdUser",
      email: "regularid@test.com",
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
    testPlan = await plan.create({
      name: "Plano para GET [id]",
      full_value: 123.45,
      period_unit: "month",
      period_value: 3,
    });
  });

  it("should return a specific plan by its ID for an admin", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${testPlan.id}`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.id).toBe(testPlan.id);
  });

  it("should return 404 for a non-existent ID", async () => {
    const newSession = await session.create(adminUser);
    const nonExistentId = orchestrator.generateRandomUUIDV4();
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${nonExistentId}`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("should return 403 for a regular user", async () => {
    const newSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${testPlan.id}`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    expect(res.status).toBe(403);
  });
});
