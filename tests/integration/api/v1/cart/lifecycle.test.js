import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import product from "models/product.js";
import session from "models/session.js";

describe("Test Cart Lifecycle (GET / POST / SYNC)", () => {
  let userSession, blockedSession;
  let prodA, prodB;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Usuário Comum (Com acesso à loja)
    let standardUser = await user.create({
      username: "consumer",
      email: "buy@test.com",
      password: "StrongPassword123@",
    });
    standardUser = await user.update({
      id: standardUser.id,
      password: "StrongPassword123@",
    });
    standardUser = await user.addFeatures(standardUser, ["shop:consumer:view"]);
    userSession = await session.create(standardUser);

    // 2. Criar Usuário Bloqueado (Sem acesso à loja)
    let blockedUser = await user.create({
      username: "blocked",
      email: "block@test.com",
      password: "StrongPassword123@",
    });
    blockedUser = await user.update({
      id: blockedUser.id,
      password: "StrongPassword123@",
    });
    // Remove explicitamente a feature se ela vier por padrão
    await user.removeFeatures(blockedUser, ["shop:consumer:view"]);
    blockedSession = await session.create(blockedUser);

    // 3. Criar Produtos
    prodA = await product.create({
      name: "Produto A",
      slug: "prod-a",
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

    prodB = await product.create({
      name: "Produto B",
      slug: "prod-b",
      description: "...",
      category: "Test",
      price_in_cents: 2000,
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
    // Garante carrinho limpo para o usuário de teste
    await fetch(`${orchestrator.webserverUrl}/api/v1/cart`, {
      method: "DELETE",
      headers: { cookie: `session_id=${userSession.token}` },
    });
  });

  describe("Happy Path", () => {
    test("GET /cart should return empty cart initially", async () => {
      const response = await fetch(`${orchestrator.webserverUrl}/api/v1/cart`, {
        headers: { cookie: `session_id=${userSession.token}` },
      });
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.items).toHaveLength(0);
    });

    test("POST /cart/items should add item", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/cart/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${userSession.token}`,
          },
          body: JSON.stringify({
            product_id: prodA.id,
            quantity: 2,
          }),
        },
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.quantity).toBe(2);
    });

    test("POST /cart/sync should merge local items with database items", async () => {
      // 1. Adiciona item A (qtd: 1) no banco via API
      await fetch(`${orchestrator.webserverUrl}/api/v1/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${userSession.token}`,
        },
        body: JSON.stringify({ product_id: prodA.id, quantity: 1 }),
      });

      // 2. Simula "Carrinho Local" (A: +2, B: 5)
      const localItems = [
        { product_id: prodA.id, quantity: 2 },
        { product_id: prodB.id, quantity: 5 },
      ];

      // 3. Chama o Endpoint de Sync
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/cart/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${userSession.token}`,
          },
          body: JSON.stringify(localItems),
        },
      );

      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.items).toHaveLength(2);

      const itemA = body.items.find((i) => i.product_id === prodA.id);
      expect(itemA.quantity).toBe(3); // 1 + 2

      const itemB = body.items.find((i) => i.product_id === prodB.id);
      expect(itemB.quantity).toBe(5); // 0 + 5
    });
  });

  describe("Error Handling & Edge Cases", () => {
    describe("Authorization Errors", () => {
      test("Should return 403 if user lacks 'shop:consumer:view' feature", async () => {
        const response = await fetch(
          `${orchestrator.webserverUrl}/api/v1/cart`,
          {
            headers: { cookie: `session_id=${blockedSession.token}` },
          },
        );
        expect(response.status).toBe(403);
      });

      test("Should return 403 on POST items if user lacks permission", async () => {
        const response = await fetch(
          `${orchestrator.webserverUrl}/api/v1/cart/items`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: `session_id=${blockedSession.token}`,
            },
            body: JSON.stringify({ product_id: prodA.id, quantity: 1 }),
          },
        );
        expect(response.status).toBe(403);
      });
    });

    describe("Anonymous User (No Persistence)", () => {
      test("Anonymous user trying to SYNC should receive error (Login Required)", async () => {
        const response = await fetch(
          `${orchestrator.webserverUrl}/api/v1/cart/sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify([{ product_id: prodA.id, quantity: 1 }]),
          },
        );

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.name).toBe("UnauthorizedError");
      });

      test("Anonymous user trying to ADD item to DB cart should fail", async () => {
        const response = await fetch(
          `${orchestrator.webserverUrl}/api/v1/cart/items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product_id: prodA.id, quantity: 1 }),
          },
        );
        expect(response.status).toBe(401);
      });
    });

    describe("Validation Errors", () => {
      test("Should return 400 when adding item with negative quantity", async () => {
        const response = await fetch(
          `${orchestrator.webserverUrl}/api/v1/cart/items`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: `session_id=${userSession.token}`,
            },
            body: JSON.stringify({
              product_id: prodA.id,
              quantity: -5, // Inválido
            }),
          },
        );

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe(
          '"cart_quantity" deve possuir um valor mínimo de 1.',
        );
      });

      test("Should return 400 when adding item without product_id", async () => {
        const response = await fetch(
          `${orchestrator.webserverUrl}/api/v1/cart/items`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: `session_id=${userSession.token}`,
            },
            body: JSON.stringify({
              quantity: 1,
              // Faltando product_id
            }),
          },
        );

        expect(response.status).toBe(400);
      });

      test("Should return 400 when SYNC body is not an array", async () => {
        const response = await fetch(
          `${orchestrator.webserverUrl}/api/v1/cart/sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie: `session_id=${userSession.token}`,
            },
            body: JSON.stringify({ invalid: "object" }), // Deveria ser array
          },
        );

        expect(response.status).toBe(400);
      });
    });
  });
});
