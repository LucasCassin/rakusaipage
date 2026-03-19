import orchestrator from "tests/orchestrator.js";
import order from "models/order.js";
import user from "models/user.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";
import payment from "models/payment.js";
import product from "models/product.js";
import session from "models/session.js";
import cart from "models/cart.js";

describe("Test Webhook Mercado Pago (POST /api/v1/webhooks/mercadopago)", () => {
  let userSession;
  let createdOrder;
  let subscriptionPayment;
  let buyer;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Setup Básico (Usuário, Produto, Carrinho)
    buyer = await user.create({
      username: "buyer",
      email: "buyer@test.com",
      password: "StrongPassword123@",
    });
    buyer = await user.update({
      id: buyer.id,
      password: "StrongPassword123@", // Senha de admin
    });
    buyer = await user.addFeatures(buyer, ["shop:consumer:view"]);
    userSession = await session.create(buyer);

    const testProduct = await product.create({
      name: "Prod Webhook",
      slug: "prod-webhook",
      description: "...",
      category: "Test",
      price_in_cents: 1000,
      minimum_price_in_cents: 100,
      stock_quantity: 100,
      weight_in_grams: 10,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      is_active: true,
      images: [],
      allow_pickup: true,
      allow_delivery: true,
      pickup_address: "Rua Teste ABC",
      pickup_instructions: "Instrucoes de retirada",
    });

    await cart.addItem(buyer.id, { product_id: testProduct.id, quantity: 1 });

    // 2. Criar um Pedido Real (Status: Pending)
    createdOrder = await order.createFromCart({
      userId: buyer.id,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      shippingCostInCents: 0,
      shippingMethod: "PAC",
      shippingDetails: { carrier: "Correios", days: 5 },
    });

    // Forçamos um payment_gateway_id conhecido para simular que o MP conhece esse pedido
    // Na vida real, o checkout já teria feito isso.
    await order.updatePaymentInfo(createdOrder.id, {
      gatewayId: "1234567890", // ID Fictício que usaremos no teste
      gatewayData: {},
      gatewayStatus: "pending",
    });

    // 3. Criar um cenário de assinatura + pagamento pendente para PIX via boleto
    const testPlan = await plan.create({
      name: "Plano Teste PIX",
      full_value: 200,
      period_unit: "month",
      period_value: 1,
    });

    await subscription.create({
      user_id: buyer.id,
      plan_id: testPlan.id,
      payment_day: 15,
      start_date: "2025-09-15",
    });

    const userPayments = await payment.findByUserId(buyer.id);
    subscriptionPayment = userPayments.find((p) => p.status === "PENDING");
  });

  describe("Webhook Reception", () => {
    test("should return 200 OK for valid payment notification (even if status doesn't change)", async () => {
      // O Mercado Pago envia algo assim:
      // POST /webhooks/mercadopago?topic=payment&id=1234567890
      const webhookUrl = `${orchestrator.webserverUrl}/api/v1/webhooks/mercadopago?topic=payment&id=1234567890`;

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment.created",
          api_version: "v1",
          data: { id: "1234567890" },
          date_created: new Date().toISOString(),
          id: 1234567890,
          live_mode: false,
          type: "payment",
          user_id: "123456",
        }),
      });
      expect(response.status).toBe(200);
    });

    test("should confirm subscription payment after webhook payment.approved", async () => {
      expect(subscriptionPayment).toBeDefined();

      const sessionToken = await session.create(buyer);
      const pixResponse = await fetch(
        `${orchestrator.webserverUrl}/api/v1/payments/${subscriptionPayment.id}/pix`,
        {
          method: "POST",
          headers: { cookie: `session_id=${sessionToken.token}` },
        },
      );
      expect(pixResponse.status).toBe(200);
      const pixBody = await pixResponse.json();
      expect(pixBody.pix).toHaveProperty("gateway_id");

      const webhookUrl = `${orchestrator.webserverUrl}/api/v1/webhooks/mercadopago?topic=payment&id=${pixBody.pix.gateway_id}`;
      const mpResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "payment.updated",
          api_version: "v1",
          data: { id: pixBody.pix.gateway_id },
          date_created: new Date().toISOString(),
          id: pixBody.pix.gateway_id,
          live_mode: false,
          type: "payment",
          user_id: "123456",
          status: "approved",
          external_reference: subscriptionPayment.id,
        }),
      });

      expect(mpResponse.status).toBe(200);

      const updatedPayment = await payment.findById(subscriptionPayment.id);
      expect(updatedPayment.status).toBe("CONFIRMED");
    });

    test("should ignore non-payment events (return 200)", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/webhooks/mercadopago`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "subscription", // Tipo que não tratamos
            data: { id: "999" },
          }),
        },
      );

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe("Ignored");
    });
  });
});
