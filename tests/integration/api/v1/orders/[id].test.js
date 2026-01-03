import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import product from "models/product.js";
import cart from "models/cart.js";
import order from "models/order.js";
import session from "models/session.js";

describe("GET /api/v1/orders/[id]", () => {
  let adminUser, adminSession;
  let ownerUser, ownerSession;
  let strangerUser, strangerSession;
  let testProduct;
  let createdOrder;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Admin User
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(adminUser, ["shop:orders:read_all"]);
    adminSession = await session.create(adminUser);

    // 2. Owner User
    ownerUser = await user.create({
      username: "ownerUser",
      email: "owner@test.com",
      password: "StrongPassword123@",
    });
    ownerUser = await user.update({
      id: ownerUser.id,
      password: "StrongPassword123@",
    });
    ownerSession = await session.create(ownerUser);

    // 3. Stranger User
    strangerUser = await user.create({
      username: "strangerUser",
      email: "stranger@test.com",
      password: "StrongPassword123@",
    });
    strangerUser = await user.update({
      id: strangerUser.id,
      password: "StrongPassword123@",
    });
    strangerSession = await session.create(strangerUser);

    // 4. Product
    testProduct = await product.create({
      name: "Produto Teste",
      slug: "produto-teste",
      price_in_cents: 1000,
      stock_quantity: 100,
      minimum_price_in_cents: 100,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      description: "Descrição teste",
      category: "Testes",
      allow_pickup: true,
      allow_delivery: true,
      pickup_address: "Rua Teste ABC",
      pickup_instructions: "Retirar no balcão",
    });

    // 5. Create Order for Owner
    await cart.addItem(ownerUser.id, {
      product_id: testProduct.id,
      quantity: 2,
    });

    createdOrder = await order.createFromCart({
      userId: ownerUser.id,
      paymentMethod: "pix",
      shippingAddress: { zip: "12345678", number: "10" },
      shippingMethod: "PAC",
    });
  });

  describe("Access by UUID", () => {
    test("Admin should retrieve full order details", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/orders/${createdOrder.id}`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(createdOrder.id);
      expect(body.total_in_cents).toBeDefined(); // Sensitive data
      expect(body.user_id).toBe(ownerUser.id);
    });

    test("Owner should retrieve full order details", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/orders/${createdOrder.id}`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${ownerSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(createdOrder.id);
      expect(body.total_in_cents).toBeDefined();
    });

    test("Stranger should receive 403 Forbidden", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/orders/${createdOrder.id}`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${strangerSession.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
    });

    test("Anonymous should receive 403 Forbidden", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/orders/${createdOrder.id}`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(403);
    });

    test("Should return 404 if UUID does not exist", async () => {
      const randomUuid = orchestrator.generateRandomUUIDV4();
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/orders/${randomUuid}`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe("Access by Code (Public Tracking)", () => {
    test("Anonymous should retrieve sanitized order details", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/orders/${encodeURIComponent(createdOrder.code)}`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      // Check for public fields
      expect(body.code).toBe(createdOrder.code);
      expect(body.status).toBeDefined();
      expect(body.items).toBeDefined();

      // Check that sensitive fields are missing
      expect(body.user_id).toBeUndefined();
      expect(body.total_in_cents).toBeUndefined();
      expect(body.shipping_address_snapshot).toBeUndefined();
    });

    test("Admin should retrieve full order details even using Code", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/orders/${encodeURIComponent(createdOrder.code)}`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      // Admin sees full data
      expect(body.total_in_cents).toBeDefined();
      expect(body.user_id).toBe(ownerUser.id);
    });

    test("Owner should retrieve full order details even using Code", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/orders/${encodeURIComponent(createdOrder.code)}`,
        {
          method: "GET",
          headers: {
            cookie: `session_id=${ownerSession.token}`,
          },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.total_in_cents).toBeDefined();
    });

    test("Should return 404 if Code does not exist", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/orders/INVALID-CODE`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(404);
    });
  });
});
