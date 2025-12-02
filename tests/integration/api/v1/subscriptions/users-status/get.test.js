import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("GET /api/v1/subscriptions/users-status", () => {
  let adminUser, regularUser, userActive, userInactive;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Setup Usuários
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    // Garante permissão
    await user.addFeatures(adminUser, ["read:subscription:other"]);

    regularUser = await user.create({
      username: "regularUser",
      email: "regular@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    // 2. Setup Usuários Alvos
    userActive = await user.create({
      username: "UserActive",
      email: "active@test.com",
      password: "StrongPassword123@",
    });
    userInactive = await user.create({
      username: "UserInactive",
      email: "inactive@test.com",
      password: "StrongPassword123@",
    });

    // 3. Setup Plano e Assinatura
    const testPlan = await plan.create({
      name: "Plano Teste",
      full_value: 100,
      period_unit: "month",
      period_value: 1,
    });

    // Adiciona assinatura ATIVA para UserActive
    await subscription.create({
      user_id: userActive.id,
      plan_id: testPlan.id,
      payment_day: 10,
      start_date: "2023-01-01",
    });

    // UserInactive não ganha assinatura (ou poderia ter uma inativa, vamos testar sem nada primeiro)
  });

  it("should return users with their active subscription counts for admin", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/users-status`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    const resBody = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(resBody)).toBe(true);

    // Verifica UserActive
    const activeEntry = resBody.find((u) => u.username === userActive.username);
    expect(activeEntry).toBeDefined();
    expect(activeEntry.active_count).toBe(1);

    // Verifica UserInactive
    const inactiveEntry = resBody.find(
      (u) => u.username === userInactive.username,
    );
    expect(inactiveEntry).toBeDefined();
    expect(inactiveEntry.active_count).toBe(0);
  });

  it("should return 403 for regular user without permission", async () => {
    const newSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/users-status`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    expect(res.status).toBe(403);
  });

  it("should return 403 for anonymous user", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/subscriptions/users-status`,
    );
    expect(res.status).toBe(403);
  });
});
