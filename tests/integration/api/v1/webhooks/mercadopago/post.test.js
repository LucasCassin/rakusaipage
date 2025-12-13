import orchestrator from "tests/orchestrator.js";
import order from "models/order.js";
import user from "models/user.js";
import product from "models/product.js";
import session from "models/session.js";
import cart from "models/cart.js";

describe("Test Webhook Mercado Pago (POST /api/v1/webhooks/mercadopago)", () => {
  let userSession;
  let createdOrder;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Setup Básico (Usuário, Produto, Carrinho)
    let buyer = await user.create({
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
    });

    await cart.addItem(buyer.id, { product_id: testProduct.id, quantity: 1 });

    // 2. Criar um Pedido Real (Status: Pending)
    createdOrder = await order.createFromCart({
      userId: buyer.id,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000" },
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
