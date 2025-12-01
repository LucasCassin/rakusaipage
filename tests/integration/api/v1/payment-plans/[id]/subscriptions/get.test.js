import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("GET /api/v1/payment-plans/[id]/subscriptions", () => {
  let adminUser, regularUser, targetPlan, otherPlan;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Setup Admin (User existente na migração)
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    // Setup Regular User
    regularUser = await user.create({
      username: "regularUser",
      email: "regular@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });

    // Setup Planos
    targetPlan = await plan.create({
      name: "Plano Alvo",
      full_value: 100.0,
      period_unit: "month",
      period_value: 1,
    });

    otherPlan = await plan.create({
      name: "Outro Plano",
      full_value: 50.0,
      period_unit: "month",
      period_value: 1,
    });

    // Setup Alunos e Assinaturas para verificação do filtro
    const student1 = await user.create({
      username: "studentTarget",
      email: "target@test.com",
      password: "StrongPassword123@",
    });
    // (Opcional) Atualizar senha do student se fosse logar, mas aqui é só passivo

    await subscription.create({
      user_id: student1.id,
      plan_id: targetPlan.id,
      payment_day: 10,
      start_date: "2023-01-01",
    });

    const student2 = await user.create({
      username: "studentOther",
      email: "other@test.com",
      password: "StrongPassword123@",
    });

    await subscription.create({
      user_id: student2.id,
      plan_id: otherPlan.id,
      payment_day: 15,
      start_date: "2023-01-01",
    });
  });

  it("should return subscriptions for a specific plan ID for an admin", async () => {
    const newSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${targetPlan.id}/subscriptions`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    const resBody = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(resBody)).toBe(true);
    expect(resBody).toHaveLength(1);
    expect(resBody[0].username).toBe("studentTarget");
    // Garante que o aluno do outro plano não veio
    const otherStudent = resBody.find((s) => s.username === "studentOther");
    expect(otherStudent).toBeUndefined();
  });

  it("should return 404 for a non-existent Plan ID", async () => {
    const newSession = await session.create(adminUser);
    const nonExistentId = orchestrator.generateRandomUUIDV4();
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${nonExistentId}/subscriptions`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    const resBody = await res.json();

    expect(res.status).toBe(404);
    expect(resBody.message).toBe("Plano de pagamento não encontrado.");
  });

  it("should return 403 for a regular user", async () => {
    const newSession = await session.create(regularUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${targetPlan.id}/subscriptions`,
      { headers: { cookie: `session_id=${newSession.token}` } },
    );
    expect(res.status).toBe(403);
  });

  it("should return 403 for an anonymous user", async () => {
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payment-plans/${targetPlan.id}/subscriptions`,
    );
    expect(res.status).toBe(403);
  });
});
