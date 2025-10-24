import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("GET /api/v1/payments", () => {
  let adminUser, userA, userB;

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
      username: "userApay",
      email: "userapay@test.com",
      password: "StrongPassword123@",
    });
    userA = await user.update({ id: userA.id, password: "StrongPassword123@" });

    userB = await user.create({
      username: "userBpay",
      email: "userbpay@test.com",
      password: "StrongPassword123@",
    });
    userB = await user.update({ id: userB.id, password: "StrongPassword123@" });

    const testPlan = await plan.create({
      name: "Plano para Pagamentos",
      full_value: 100,
      period_unit: "month",
      period_value: 1,
    });
    // Cria uma assinatura (e um pagamento) para userA e userB
    await subscription.create({
      user_id: userA.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
    await subscription.create({
      user_id: userB.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-02-01",
    });
  });

  it("should allow an admin to get all payments", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/payments`, {
      headers: { cookie: `session_id=${newSession.token}` },
    });
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.length).toBeGreaterThanOrEqual(2);
  });

  it("should allow an admin to get payments for a specific user", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments?username=${userA.username}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody).toHaveLength(1);
    expect(resBody[0].plan_name).toBe("Plano para Pagamentos");
  });

  it("should allow a user to get their own payments", async () => {
    const newSession = await session.create(userA);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments?username=${userA.username}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(200);
    const resBody = await res.json();
    expect(resBody[0].status).toBe("PENDING");
  });

  it("should return 403 when a user tries to get another user's payments", async () => {
    const newSession = await session.create(userB);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments?username=${userA.username}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(403);
  });

  it("should return 403 when a regular user tries to list all payments", async () => {
    const newSession = await session.create(userA);
    const res = await fetch(`${orchestrator.webserverUrl}/api/v1/payments`, {
      headers: { cookie: `session_id=${newSession.token}` },
    });
    expect(res.status).toBe(403);
  });
});
