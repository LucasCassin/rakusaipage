import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("GET /api/v1/subscriptions", () => {
  let adminUser, userA, userB, testPlan;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    userA = await user.create({
      username: "userA",
      email: "usera@test.com",
      password: "StrongPassword123@",
    });
    userA = await user.update({ id: userA.id, password: "StrongPassword123@" });

    userB = await user.create({
      username: "userB",
      email: "userb@test.com",
      password: "StrongPassword123@",
    });
    userB = await user.update({ id: userB.id, password: "StrongPassword123@" });

    testPlan = await plan.create({
      name: "Plano para User A",
      full_value: 50,
      period_unit: "month",
      period_value: 1,
    });
    await subscription.create({
      user_id: userA.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
  });

  it("should allow an admin to get all subscriptions (list all)", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.length).toBeGreaterThan(0);
  });

  it("should allow an admin to get subscriptions for a specific user via query param", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions?username=${userA.username}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody).toHaveLength(1);
    expect(resBody[0].user_id).toBe(userA.id);
  });

  it("should allow a user to get their own subscriptions via query param", async () => {
    const newSession = await session.create(userA);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions?username=${userA.username}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).length).toBe(1);
  });

  it("should return 403 when a user tries to get another user's subscriptions", async () => {
    const newSession = await session.create(userB); // User B logado
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions?username=${userA.username}`,
      {
        // Tentando ver as de User A
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(403);
  });

  it("should return 403 when a regular user tries to list all subscriptions", async () => {
    const newSession = await session.create(userA);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions`,
      {
        // Sem username
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(403);
  });
});
