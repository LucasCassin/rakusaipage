import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";
import payment from "models/payment.js";
import { ForbiddenError, NotFoundError } from "errors/index.js";

describe("Payment Model", () => {
  let testUser, otherUser, testPlan, testSubscription;
  let pendingPayment;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    testUser = await user.create({
      username: "paymentUser",
      email: "payment@test.com",
      password: "StrongPassword123@",
    });
    otherUser = await user.create({
      username: "otherPaymentUser",
      email: "otherpayment@test.com",
      password: "StrongPassword123@",
    });
    testPlan = await plan.create({
      name: "Plano Pagamentos",
      full_value: 100.0,
      period_unit: "month",
      period_value: 1,
    });
    testSubscription = await subscription.create({
      user_id: testUser.id,
      plan_id: testPlan.id,
      payment_day: 5,
      start_date: "2025-01-01",
    });

    const userPayments = await payment.findByUserId(testUser.id);
    pendingPayment = userPayments[0];
  });

  describe("userIndicatePaid()", () => {
    it("should allow a user to indicate they have paid", async () => {
      const updatedPayment = await payment.userIndicatePaid(
        pendingPayment.id,
        testUser.id,
      );
      expect(updatedPayment.user_notified_payment).toBe(true);
      expect(updatedPayment.user_notified_at).toBeDefined();
      expect(updatedPayment.status).toBe("PENDING"); // O status oficial não muda
    });

    it("should throw a ForbiddenError if another user tries to indicate payment", async () => {
      await expect(
        payment.userIndicatePaid(pendingPayment.id, otherUser.id),
      ).rejects.toThrow(ForbiddenError);
    });
    it("should throw an error if trying to indicate payment on a confirmed payment", async () => {
      const newSub = await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2026-01-01",
      });
      const newPayment = (await payment.findByUserId(testUser.id)).find(
        (p) => p.subscription_id === newSub.id,
      );
      await payment.adminConfirmPaid(newPayment.id); // Pagamento confirmado

      await expect(
        payment.userIndicatePaid(newPayment.id, testUser.id),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("adminConfirmPaid()", () => {
    it("should allow an admin to confirm a payment", async () => {
      const confirmedPayment = await payment.adminConfirmPaid(
        pendingPayment.id,
      );
      expect(confirmedPayment.status).toBe("CONFIRMED");
      expect(confirmedPayment.confirmed_at).toBeDefined();
    });
    it("should throw an error if trying to confirm an already confirmed payment", async () => {
      const newSub = await subscription.create({
        user_id: testUser.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2028-01-01",
      });
      const newPayment = (await payment.findByUserId(testUser.id)).find(
        (p) => p.subscription_id === newSub.id,
      );
      await payment.adminConfirmPaid(newPayment.id); // Confirma a primeira vez

      await expect(payment.adminConfirmPaid(newPayment.id)).rejects.toThrow(
        NotFoundError,
      ); // Tenta confirmar de novo
    });
  });

  describe("findAndSetOverdue()", () => {
    it("should find and update pending payments past their due date", async () => {
      // Cria um pagamento com data no passado
      await subscription.create({
        user_id: otherUser.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2020-01-01",
      });
      const overduePayment = (await payment.findByUserId(otherUser.id))[0];

      // Cria um pagamento com data no futuro
      await subscription.create({
        user_id: otherUser.id,
        plan_id: testPlan.id,
        payment_day: 1,
        start_date: "2099-01-01",
      });

      const updatedToOverdue = await payment.findAndSetOverdue();

      expect(updatedToOverdue).toHaveLength(1);
      expect(updatedToOverdue[0].id).toBe(overduePayment.id);

      const checkedPayment = await payment.findById(overduePayment.id);
      expect(checkedPayment.status).toBe("OVERDUE");
    });
  });

  describe("del()", () => {
    let deletablePayment, confirmedPayment;

    // Cria dados frescos para este conjunto de testes
    beforeAll(async () => {
      const delUser = await user.create({
        username: "delUser",
        email: "del@test.com",
        password: "StrongPassword123@",
      });
      const delPlan = await plan.create({
        name: "Plano para Deletar",
        full_value: 10,
        period_unit: "day",
        period_value: 1,
      });

      // Pagamento PENDENTE
      const delSub1 = await subscription.create({
        user_id: delUser.id,
        plan_id: delPlan.id,
        payment_day: 1,
        start_date: "2025-01-01",
      });
      deletablePayment = (await payment.findByUserId(delUser.id)).find(
        (p) => p.subscription_id === delSub1.id,
      );

      // Pagamento CONFIRMADO
      const delSub2 = await subscription.create({
        user_id: delUser.id,
        plan_id: delPlan.id,
        payment_day: 1,
        start_date: "2026-01-01",
      });
      confirmedPayment = (await payment.findByUserId(delUser.id)).find(
        (p) => p.subscription_id === delSub2.id,
      );
      await payment.adminConfirmPaid(confirmedPayment.id); // Confirma o pagamento
    });

    it("should delete a PENDING payment by its ID", async () => {
      await expect(payment.del(deletablePayment.id)).resolves.toEqual({
        id: deletablePayment.id,
      });

      // Verifica se foi realmente deletado
      const found = await payment.findById(deletablePayment.id);
      expect(found).toBeUndefined();
    });

    // --- NOVO TESTE ---
    it("should throw ForbiddenError when trying to delete a CONFIRMED payment", async () => {
      await expect(payment.del(confirmedPayment.id)).rejects.toThrow(
        ForbiddenError,
      );
      await expect(payment.del(confirmedPayment.id)).rejects.toThrow(
        "Pagamentos confirmados não podem ser deletados.",
      );
    });

    it("should throw NotFoundError when trying to delete a non-existent payment", async () => {
      const randomId = orchestrator.generateRandomUUIDV4();
      await expect(payment.del(randomId)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when trying to delete an already deleted payment", async () => {
      // 'deletablePayment' já foi deletado no primeiro teste deste bloco
      await expect(payment.del(deletablePayment.id)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
