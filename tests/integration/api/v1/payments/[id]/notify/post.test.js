import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import payment from "models/payment.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";

describe("POST /api/v1/payments/[id]/notify", () => {
  let adminUser, testPayment;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Setup Admin
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    // Setup User Devedor
    const debtor = await user.create({
      username: "debtorUser",
      email: "debtor@test.com",
      password: "StrongPassword123@",
    });

    // Setup Plano
    const testPlan = await plan.create({
      name: "Plano Teste Notify",
      full_value: 100,
      period_unit: "month",
      period_value: 1,
    });

    // Setup Assinatura
    await subscription.create({
      user_id: debtor.id,
      plan_id: testPlan.id,
      payment_day: 10,
      start_date: "2023-01-01",
    });

    const payments = await payment.findByUserId(debtor.id);
    testPayment = payments[0];
  });

  it("should send notification successfully (Admin)", async () => {
    const sessionToken = await session.create(adminUser);
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments/${testPayment.id}/notify`,
      {
        method: "POST",
        headers: { cookie: `session_id=${sessionToken.token}` },
      },
    );
    expect(response.status).toBe(200);
  });

  it("should return 400 if payment is already paid", async () => {
    // Marca como pago
    await payment.adminConfirmPaid(testPayment.id);

    const sessionToken = await session.create(adminUser);
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/payments/${testPayment.id}/notify`,
      {
        method: "POST",
        headers: { cookie: `session_id=${sessionToken.token}` },
      },
    );
    expect(response.status).toBe(400);
  });
});
