import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("GET /api/v1/subscriptions/[id]", () => {
  let adminUser, userA, userB, subOfUserA;

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
      username: "userAsubget",
      email: "userAsubget@test.com",
      password: "StrongPassword123@",
    });
    userA = await user.update({ id: userA.id, password: "StrongPassword123@" });

    userB = await user.create({
      username: "userBsubget",
      email: "userBsubget@test.com",
      password: "StrongPassword123@",
    });
    userB = await user.update({ id: userB.id, password: "StrongPassword123@" });

    const testPlan = await plan.create({
      name: "Plano para Sub Get",
      full_value: 50,
      period_unit: "month",
      period_value: 1,
    });
    subOfUserA = await subscription.create({
      user_id: userA.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
  });

  it("should allow an admin to get any subscription by ID", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${subOfUserA.id}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.id).toBe(subOfUserA.id);
    expect(resBody.user_id).toBe(userA.id);
  });

  it("should allow a user to get their OWN subscription by ID", async () => {
    const newSession = await session.create(userA);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${subOfUserA.id}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.id).toBe(subOfUserA.id);
  });

  it("should return 403 when a user tries to get another user's subscription", async () => {
    const newSession = await session.create(userB);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${subOfUserA.id}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(403);
  });

  it("should return 404 for a non-existent subscription ID", async () => {
    const newSession = await session.create(adminUser);
    const nonExistentId = orchestrator.generateRandomUUIDV4();
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${nonExistentId}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(404);
  });

  it("should return 403 for an anonymous user", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/${subOfUserA.id}`,
    );
    expect(res.status).toBe(403);
  });
});
