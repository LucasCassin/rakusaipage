import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("DELETE /api/v1/subscriptions/[id]", () => {
  let adminUser, regularUser, testPlan;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    regularUser = await user.create({
      username: "regularSubDelete",
      email: "regularsubdelete@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    testPlan = await plan.create({
      name: "Plano para Delete",
      full_value: 100,
      period_unit: "month",
      period_value: 1,
    });
  });

  it("should allow an admin to delete a subscription", async () => {
    const tempSub = await subscription.create({
      user_id: regularUser.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
    const newSession = await session.create(adminUser);

    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${tempSub.id}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(200);

    // Verifica se foi realmente deletado
    const findRes = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${tempSub.id}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(findRes.status).toBe(404);
  });

  it("should return 404 for a non-existent subscription ID", async () => {
    const newSession = await session.create(adminUser);
    const nonExistentId = orchestrator.generateRandomUUIDV4();
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${nonExistentId}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(404);
  });

  it("should return 403 for a regular user", async () => {
    const tempSub = await subscription.create({
      user_id: regularUser.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-02-01",
    });
    const newSession = await session.create(regularUser);

    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${tempSub.id}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(403);
  });
});
