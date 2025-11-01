import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";

describe("PATCH /api/v1/payment-plans/[id]", () => {
  let adminUser, regularUser, testPlan;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
    adminUser = await user.findOneUser({ username: "mainUser" });
    regularUser = await user.create({
      username: "regularPatchUser",
      email: "regularpatch@test.com",
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
      name: "Plano para PATCH",
      full_value: 100,
      period_unit: "month",
      period_value: 1,
    });
  });

  it("should update a plan and return 200 for an admin", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${testPlan.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ name: "Nome Super Atualizado" }),
      },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(resBody.name).toBe("Nome Super Atualizado");
  });

  it("should return 400 for invalid data", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${testPlan.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ period_value: -10 }), // Valor inválido
      },
    );
    expect(res.status).toBe(400);
  });

  it("should return 403 for a regular user", async () => {
    const newSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${testPlan.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${newSession.token}`,
        },
        body: JSON.stringify({ name: "Tentativa de Update" }),
      },
    );
    expect(res.status).toBe(403);
  });
});
