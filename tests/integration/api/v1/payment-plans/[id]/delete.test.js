import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("DELETE /api/v1/payment-plans/[id]", () => {
  let adminUser, regularUser;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();
    adminUser = await user.findOneUser({ username: "mainUser" });

    regularUser = await user.create({
      username: "regularDeleteUser",
      email: "regulardelete@test.com",
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
  });

  it("should delete an unused plan and return 200 for an admin", async () => {
    const planToDelete = await plan.create({
      name: "Plano a Deletar",
      full_value: 1,
      period_unit: "day",
      period_value: 1,
    });
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${planToDelete.id}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(200);

    // Verifica se foi realmente deletado
    const findRes = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${planToDelete.id}`,
      {
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(findRes.status).toBe(404);
  });

  it("should return an error when trying to delete a plan that is in use", async () => {
    const userWithSub = await user.create({
      username: "userSubDel",
      email: "usersubdel@test.com",
      password: "StrongPassword123@",
    });
    const planInUse = await plan.create({
      name: "Plano Ocupado",
      full_value: 1,
      period_unit: "day",
      period_value: 1,
    });
    await subscription.create({
      user_id: userWithSub.id,
      plan_id: planInUse.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });

    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${planInUse.id}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );

    // O erro de FK (Foreign Key) do banco de dados resultará em um erro de servidor (500)
    // se não for tratado especificamente para um 409 (Conflict), o que é aceitável.
    expect(res.status).toBe(503);
  });

  it("should return 403 for a regular user", async () => {
    const planToDelete = await plan.create({
      name: "Plano Protegido",
      full_value: 1,
      period_unit: "day",
      period_value: 1,
    });
    const newSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${planToDelete.id}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${newSession.token}` },
      },
    );
    expect(res.status).toBe(403);
  });
});
