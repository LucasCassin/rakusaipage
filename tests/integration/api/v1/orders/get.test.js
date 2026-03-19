import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import product from "models/product.js";
import cart from "models/cart.js";
import order from "models/order.js";
import session from "models/session.js";
import { number } from "joi";

describe("GET /api/v1/orders (Admin List)", () => {
  let adminSession, userSession, adminUser, buyer;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Setup Admin
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(adminUser, ["shop:orders:read_all"]);
    adminSession = await session.create(adminUser);

    // 2. Setup User Comum
    buyer = await user.create({
      username: "buyer",
      email: "buyer@u.com",
      password: "StrongPassword123@",
    });
    buyer = await user.update({
      id: buyer.id,
      password: "StrongPassword123@",
    });
    userSession = await session.create(buyer);

    // 3. Cria Pedidos
    const prod = await product.create({
      name: "Item A",
      slug: "item-a",
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

    // Pedido 1: Pago
    await cart.addItem(buyer.id, { product_id: prod.id, quantity: 1 });
    const order1 = await order.createFromCart({
      userId: buyer.id,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      shippingMethod: "PAC",
    });
    // Update manual para simular pagamento
    const db = await import("infra/database.js").then((m) => m.default);
    await db.query({
      text: "UPDATE orders SET status = 'paid' WHERE id = $1",
      values: [order1.id],
    });

    // Pedido 2: Pendente
    await cart.addItem(buyer.id, { product_id: prod.id, quantity: 1 });
    await order.createFromCart({
      userId: buyer.id,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      shippingMethod: "PAC",
    });
  });

  test("should list all orders for admin", async () => {
    const response = await fetch(`${orchestrator.webserverUrl}/api/v1/orders`, {
      method: "GET",
      headers: { cookie: `session_id=${adminSession.token}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.orders).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
    // Verifica se veio o objeto customer
    expect(body.orders[0].customer.username).toBe("buyer");
  });

  test("should filter orders by status (Kanban Column)", async () => {
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/orders?status=paid`,
      {
        method: "GET",
        headers: { cookie: `session_id=${adminSession.token}` },
      },
    );

    const body = await response.json();
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0].status).toBe("paid");
  });

  test("should forbid non-admin users", async () => {
    const response = await fetch(`${orchestrator.webserverUrl}/api/v1/orders`, {
      method: "GET",
      headers: { cookie: `session_id=${userSession.token}` },
    });
    expect(response.status).toBe(403);
  });
});
