import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import product from "models/product.js";
import session from "models/session.js";
import cart from "models/cart.js";

describe("Test Checkout Flow (POST /api/v1/checkout)", () => {
  let userSession;
  let testProduct;
  let buyer;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Usuário Real (Logado)
    buyer = await user.create({
      username: "realuser",
      email: "real@test.com",
      password: "StrongPassword123@",
    });
    buyer = await user.update({
      id: buyer.id,
      password: "StrongPassword123@",
    });
    buyer = await user.addFeatures(buyer, ["shop:consumer:view"]);
    userSession = await session.create(buyer);

    // 2. Criar Produto
    testProduct = await product.create({
      name: "Produto Checkout",
      slug: "prod-checkout",
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
  });

  beforeEach(async () => {
    // Limpa carrinho do usuário real
    await cart.clearCart(buyer.id);
  });

  describe("Guest Checkout (Shadow Users)", () => {
    test("should create a new shadow user and complete order with calculated shipping", async () => {
      const guestPayload = {
        payment_method: "pix",
        shipping_address_snapshot: { zip: "00000000" },
        username: "visitante01",
        email: "guest_new@test.com",
        items: [{ product_id: testProduct.id, quantity: 2 }],
        shipping_method: "PAC",
        // Removido: shipping_cost_in_cents (calculado no back)
      };

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(guestPayload),
        },
      );

      const body = await response.json();
      expect(response.status).toBe(201);

      // Valida Usuário Sombra
      const shadowUser = await user.findOneUser({
        email: "guest_new@test.com",
      });
      expect(shadowUser).toBeDefined();
      expect(shadowUser.username).toMatch(/^ecmlc/);

      // Valida Pedido
      expect(body.order.user_id).toBe(shadowUser.id);

      // Cálculo:
      // Subtotal: 2 * 1000 = 2000
      // Frete (Mock PAC): 2100
      // Total: 4100
      expect(body.order.total_in_cents).toBe(4100);
      expect(body.order.shipping_cost_in_cents).toBe(2100);
    });

    test("should reuse existing shadow user for subsequent purchases", async () => {
      const guestPayload = {
        payment_method: "pix",
        shipping_address_snapshot: { zip: "00000000" },
        username: "visitante01",
        email: "guest_new@test.com",
        items: [{ product_id: testProduct.id, quantity: 1 }],
        shipping_method: "PAC",
      };

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(guestPayload),
        },
      );

      expect(response.status).toBe(201);

      // Verifica se manteve o mesmo usuário
      const users = await user.findUsersByFeatures(["shop:consumer:view"]);
      const guests = users.filter((u) => u.email === "guest_new@test.com");
      expect(guests).toHaveLength(1);
    });

    test("should REJECT guest checkout if email belongs to a REAL user", async () => {
      const attackPayload = {
        payment_method: "pix",
        shipping_address_snapshot: { zip: "00000000" },
        username: "imposter",
        email: "real@test.com",
        items: [{ product_id: testProduct.id, quantity: 5 }],
        shipping_method: "PAC",
      };

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attackPayload),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Logged User Checkout", () => {
    test("should process checkout normally for logged users", async () => {
      await fetch(`${orchestrator.webserverUrl}/api/v1/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${userSession.token}`,
        },
        body: JSON.stringify({ product_id: testProduct.id, quantity: 1 }),
      });

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${userSession.token}`,
          },
          body: JSON.stringify({
            payment_method: "pix",
            shipping_address_snapshot: { zip: "12345678", street: "Home" },
            shipping_method: "PAC",
          }),
        },
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.order.user_id).toBeDefined();
    });
  });

  describe("Validation & Error Handling", () => {
    test("should return 400 if payment method is missing", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${userSession.token}`,
          },
          body: JSON.stringify({
            shipping_address_snapshot: { zip: "00000000" },
            shipping_method: "PAC",
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toMatch(/payment_method/);
    });

    test("should return 400 if shipping address is missing", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${userSession.token}`,
          },
          body: JSON.stringify({
            payment_method: "pix",
            shipping_method: "PAC",
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    test("should return 400 if shipping method is missing", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${userSession.token}`,
          },
          body: JSON.stringify({
            payment_method: "pix",
            shipping_address_snapshot: { zip: "00000000" },
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toMatch(/shipping_method/);
    });

    test("should return 400 for Guest Checkout without customer details", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method: "pix",
            shipping_address_snapshot: { zip: "00000000" },
            items: [{ product_id: testProduct.id, quantity: 1 }],
            shipping_method: "PAC",
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    test("should return 400 for Guest Checkout with empty cart", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method: "pix",
            shipping_address_snapshot: { zip: "00000000" },
            customer: { username: "fail", email: "fail@test.com" },
            items: [], // Carrinho vazio
            shipping_method: "PAC",
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toMatch(/carrinho está vazio/i);
    });
  });
});
