import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import product from "models/product.js";
import cart from "models/cart.js";
import order from "models/order.js";
import session from "models/session.js";
import { allow, number } from "joi";

describe("PATCH /api/v1/orders/:id/status", () => {
  let adminSession, orderId, adminUser, buyer;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Admin
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(adminUser, ["shop:orders:manage"]);
    adminSession = await session.create(adminUser);

    // Produto & Pedido
    const prod = await product.create({
      name: "Item",
      slug: "item",
      price_in_cents: 1000,
      stock_quantity: 10,
      minimum_price_in_cents: 100,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      description: "...",
      category: "test",
      images: [],
      allow_pickup: true,
      allow_delivery: true,
      pickup_address: "Rua Teste ABC",
      pickup_instructions: "Instrucoes de retirada",
    });

    buyer = await user.create({
      username: "buyer",
      email: "buyer@u.com",
      password: "StrongPassword123@",
    });
    buyer = await user.update({
      id: buyer.id,
      password: "StrongPassword123@",
    });
    await cart.addItem(buyer.id, { product_id: prod.id, quantity: 1 });

    const newOrder = await order.createFromCart({
      userId: buyer.id,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      shippingMethod: "PAC",
    });
    orderId = newOrder.id;

    // Simula Pagamento para permitir envio
    const db = await import("infra/database.js").then((m) => m.default);
    await db.query({
      text: "UPDATE orders SET status = 'paid' WHERE id = $1",
      values: [orderId],
    });
  });

  test("should update status to SHIPPED (with tracking code)", async () => {
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          status: "shipped",
          tracking_code: "BR123456",
        }),
      },
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("shipped");
    expect(body.tracking_code).toBe("BR123456");
  });

  test("should fail to update to SHIPPED without tracking code", async () => {
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          status: "shipped",
          // tracking_code faltando
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  test("should update status to DELIVERED", async () => {
    // Pedido já está shipped do teste anterior
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${adminSession.token}`,
        },
        body: JSON.stringify({
          status: "delivered",
        }),
      },
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("delivered");
  });
});
