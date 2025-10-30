import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";
import payment from "models/payment.js";

describe("DELETE /api/v1/payments/[id]", () => {
  let adminUser, regularUser;
  let paymentForUser, paymentForAdmin, paymentConfirmed;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Cria admin e adiciona a nova feature
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword1T@",
    });
    // Damos ao admin todas as features de pagamento para os testes
    await user.addFeatures(adminUser, [
      "delete:payment:other",
      "update:payment:confirm_paid",
    ]);

    // Cria usuário regular (sem a feature)
    regularUser = await user.create({
      username: "paymentDeleter",
      email: "deleter@test.com",
      password: "StrongPassword1T@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword1T@",
    });

    // Cria um plano genérico
    const testPlan = await plan.create({
      name: "Plano para Deletar Pagamento",
      full_value: 10,
      period_unit: "day",
      period_value: 1,
    });

    // --- Cenário 1: Pagamento deletável (de outro usuário) ---
    const subUser = await subscription.create({
      user_id: regularUser.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-01-01",
    });
    paymentForUser = (await payment.findByUserId(regularUser.id)).find(
      (p) => p.subscription_id === subUser.id,
    );

    // --- Cenário 2: Pagamento NÃO deletável (do próprio admin) ---
    const subAdmin = await subscription.create({
      user_id: adminUser.id,
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-02-01",
    });
    paymentForAdmin = (await payment.findByUserId(adminUser.id)).find(
      (p) => p.subscription_id === subAdmin.id,
    );

    // --- Cenário 3: Pagamento NÃO deletável (confirmado) ---
    const subConfirmed = await subscription.create({
      user_id: regularUser.id, // De outro usuário
      plan_id: testPlan.id,
      payment_day: 1,
      start_date: "2025-03-01",
    });
    paymentConfirmed = (await payment.findByUserId(regularUser.id)).find(
      (p) => p.subscription_id === subConfirmed.id,
    );
    // Confirma o pagamento
    await payment.adminConfirmPaid(paymentConfirmed.id);
  });

  it("should allow an admin to delete another user's (PENDING) payment", async () => {
    const adminSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments/${paymentForUser.id}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${adminSession.token}` },
      },
    );
    const resBody = await res.json();

    expect(res.status).toBe(200);
    expect(resBody.id).toBe(paymentForUser.id);

    // Verifica se foi deletado do banco
    const found = await payment.findById(paymentForUser.id);
    expect(found).toBeUndefined();
  });

  // --- NOVO TESTE: REGRA DE NEGÓCIO ---
  it("should return 403 when admin tries to delete a CONFIRMED payment", async () => {
    const adminSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments/${paymentConfirmed.id}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${adminSession.token}` },
      },
    );
    const resBody = await res.json();

    expect(res.status).toBe(403);
    expect(resBody.message).toBe(
      "Pagamentos confirmados não podem ser deletados.",
    );
  });

  // --- NOVO TESTE: REGRA DE SEGURANÇA ---
  it("should return 403 when admin tries to delete their OWN payment", async () => {
    const adminSession = await session.create(adminUser);
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments/${paymentForAdmin.id}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${adminSession.token}` },
      },
    );
    const resBody = await res.json();

    expect(res.status).toBe(403);
    expect(resBody.message).toBe(
      "Você não pode deletar seus próprios pagamentos.",
    );
  });

  it("should return 403 for a regular user (without permission)", async () => {
    const regularSession = await session.create(regularUser);

    // Cria um pagamento novo só para este teste
    const subTemp = await subscription.create({
      user_id: adminUser.id, // Tenta deletar um do admin
      plan_id: (await plan.findAll())[0].id,
      payment_day: 1,
      start_date: "2026-01-01",
    });
    const paymentToFail = (await payment.findByUserId(adminUser.id)).find(
      (p) => p.subscription_id === subTemp.id,
    );

    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments/${paymentToFail.id}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${regularSession.token}` },
      },
    );

    expect(res.status).toBe(403);
  });

  it("should return 404 when admin tries to delete a non-existent payment", async () => {
    const adminSession = await session.create(adminUser);
    const randomId = orchestrator.generateRandomUUIDV4();
    const res = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments/${randomId}`,
      {
        method: "DELETE",
        headers: { cookie: `session_id=${adminSession.token}` },
      },
    );
    expect(res.status).toBe(404);
  });
});
