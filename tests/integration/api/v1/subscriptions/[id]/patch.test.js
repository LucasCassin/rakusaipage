import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("PATCH /api/v1/subscriptions/[id]", () => {
  let adminUser, regularUser, testSub;

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
      username: "regularSubPatch",
      email: "regularsubpatch@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    const testPlan = await plan.create({
      name: "Plano para Patch",
      full_value: 100,
      period_unit: "month",
      period_value: 1,
    });
    testSub = await subscription.create({
      user_id: regularUser.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
  });

  it("should allow an admin to update a subscription", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${testSub.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ is_active: false, discount_value: 50.0 }),
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.is_active).toBe(false);
    expect(resBody.discount_value).toBe("50.00");
  });

  it("should return 400 for invalid data (e.g., 'is_active' as a string)", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${testSub.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ is_active: "not-a-boolean" }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("should return 404 for a non-existent subscription ID", async () => {
    const newSession = await session.create(adminUser);
    const nonExistentId = orchestrator.generateRandomUUIDV4();
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${nonExistentId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ is_active: false }),
      },
    );
    expect(res.status).toBe(404);
  });

  it("should return 403 for a regular user", async () => {
    const newSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${testSub.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ is_active: false }),
      },
    );
    expect(res.status).toBe(403);
  });
});
