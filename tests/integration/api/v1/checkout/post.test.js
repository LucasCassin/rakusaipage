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
    });
  });

  beforeEach(async () => {
    // Limpa carrinho do usuário real
    await cart.clearCart(buyer.id);
  });

  describe("Guest Checkout (Shadow Users)", () => {
    test("should create a new shadow user (ecmlc prefix) and complete order", async () => {
      const guestPayload = {
        payment_method: "pix",
        shipping_cost_in_cents: 1000,
        shipping_address_snapshot: { zip: "00000" },
        // Dados do Cliente Visitante
        username: "visitante01",
        email: "guest_new@test.com",
        // Itens locais
        items: [{ product_id: testProduct.id, quantity: 2 }],
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

      // Valida Criação do Usuário
      const shadowUser = await user.findOneUser({
        email: "guest_new@test.com",
      });
      expect(shadowUser).toBeDefined();
      expect(shadowUser.username).toMatch(/^ecmlc/); // Prefixo correto

      // Valida Remoção de Features
      expect(shadowUser.features).not.toContain("create:session");
      expect(shadowUser.features).not.toContain("read:user:self");

      // Valida Pedido
      expect(body.order.user_id).toBe(shadowUser.id);
      expect(body.order.total_in_cents).toBe(3000); // (1000*2) + 1000 frete
    });

    test("should reuse existing shadow user (ecmlc) for subsequent purchases", async () => {
      // O teste anterior criou guest_new@test.com. Vamos tentar comprar de novo com ele.
      const guestPayload = {
        payment_method: "pix",
        shipping_cost_in_cents: 500,
        shipping_address_snapshot: { zip: "00000" },
        username: "visitante01",
        email: "guest_new@test.com", // Mesmo email
        items: [{ product_id: testProduct.id, quantity: 1 }],
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

      // Verifica se NÃO criou outro usuário (deve ser o mesmo ID)
      const users = await user.findUsersByFeatures(["shop:consumer:view"]); // Filtro genérico
      const guests = users.filter((u) => u.email === "guest_new@test.com");
      expect(guests).toHaveLength(1);
    });

    test("should REJECT guest checkout if email belongs to a REAL user", async () => {
      // Tenta comprar usando o email do 'realuser' (criado no beforeAll) sem estar logado
      const attackPayload = {
        payment_method: "pix",
        shipping_cost_in_cents: 1000,
        shipping_address_snapshot: { zip: "00000" },
        username: "imposter",
        email: "real@test.com", // Email do usuário real
        items: [{ product_id: testProduct.id, quantity: 5 }],
      };

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attackPayload),
        },
      );

      const body = await response.json();

      // Deve falhar e mandar logar
      expect(response.status).toBe(403);
      expect(body.message).toMatch(/faça login/i);

      // CRÍTICO: Deve ter salvo os itens no carrinho do usuário real (Merge)
      const realUser = await user.findOneUser({ email: "real@test.com" });
      const savedCart = await cart.getCart(realUser.id);

      const item = savedCart.items.find((i) => i.product_id === testProduct.id);
      expect(item).toBeDefined();
      expect(item.quantity).toBe(5); // Os 5 itens da tentativa anônima
    });
  });

  describe("Logged User Checkout", () => {
    test("should process checkout normally for logged users", async () => {
      // Adiciona item via API de cart antes
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
            shipping_cost_in_cents: 0,
            shipping_address_snapshot: { street: "Home" },
            // items não é enviado aqui, usa o do banco
          }),
        },
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.order.user_id).toBeDefined(); // ID do realuser
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
            // payment_method faltando
            shipping_cost_in_cents: 1000,
            shipping_address_snapshot: { zip: "00000" },
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
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
            shipping_cost_in_cents: 1000,
            // shipping_address_snapshot faltando
          }),
        },
      );

      expect(response.status).toBe(400);
    });

    test("should return 400 for Guest Checkout without customer details", async () => {
      // Guest tentando comprar sem mandar nome/email
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method: "pix",
            shipping_cost_in_cents: 1000,
            shipping_address_snapshot: { zip: "00000" },
            items: [{ product_id: testProduct.id, quantity: 1 }],
            // customer faltando
          }),
        },
      );

      expect(response.status).toBe(400); // Validator.js deve pegar isso
    });

    test("should return 400 for Guest Checkout with empty cart", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method: "pix",
            shipping_cost_in_cents: 1000,
            shipping_address_snapshot: { zip: "00000" },
            customer: { username: "fail", email: "fail@test.com" },
            items: [], // Carrinho vazio
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toMatch(/carrinho está vazio/i);
    });
  });
});
