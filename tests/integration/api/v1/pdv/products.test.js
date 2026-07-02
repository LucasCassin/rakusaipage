import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import pdvProduct from "models/pdv_product.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("API /api/v1/pdv/products", () => {
  let adminSession, sellerSession, unauthorizedSession, expiredSession;

  beforeAll(async () => {
    const adminUser = await user.findOneUser({ username: "mainUser" });
    const updatedAdmin = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(updatedAdmin, ["pdv:products:manage"]);
    adminSession = await session.create(updatedAdmin);

    let sellerUser = await user.create({
      username: "pdvProductsSeller",
      email: "pdv-products-seller@test.com",
      password: "StrongPassword123@",
    });
    sellerUser = await user.update({
      id: sellerUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(sellerUser, ["pdv:sell"]);
    sellerSession = await session.create(sellerUser);

    let unauthorizedUser = await user.create({
      username: "pdvProductsNoPerms",
      email: "pdv-products-noperms@test.com",
      password: "StrongPassword123@",
    });
    unauthorizedUser = await user.update({
      id: unauthorizedUser.id,
      password: "StrongPassword123@",
    });
    await user.removeFeatures(unauthorizedUser, unauthorizedUser.features);
    unauthorizedSession = await session.create(unauthorizedUser);

    const expiredUser = await user.create({
      username: "pdvProductsExpired",
      email: "pdv-products-expired@test.com",
      password: "StrongPassword123@",
    });
    await user.addFeatures(expiredUser, ["pdv:products:manage"]);
    await user.expireUserPassword(expiredUser);
    expiredSession = await session.create(expiredUser);
  });

  describe("Security Check", () => {
    test("Anonymous user should get 403 on GET", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products`,
      );
      expect(res.status).toBe(403);
    });

    test("User without feature should get 403 on GET", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products`,
        {
          headers: { cookie: `session_id=${unauthorizedSession.token}` },
        },
      );
      expect(res.status).toBe(403);
    });

    test("User with expired password should get 403 PasswordExpiredError", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products`,
        {
          headers: { cookie: `session_id=${expiredSession.token}` },
        },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.name).toBe("PasswordExpiredError");
    });

    test("Anonymous user should get 403 on POST admin", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Hack", price_in_cents: 100 }),
        },
      );
      expect(res.status).toBe(403);
    });

    test("Seller (pdv:sell only) should get 403 on POST admin", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sellerSession.token}`,
          },
          body: JSON.stringify({ name: "Hack", price_in_cents: 100 }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/pdv/products", () => {
    test("Seller should only see active products", async () => {
      const active = await pdvProduct.create({
        name: "Bolo Visível",
        price_in_cents: 1000,
      });
      const inactive = await pdvProduct.create({
        name: "Bolo Invisível",
        price_in_cents: 1000,
      });
      await pdvProduct.remove(inactive.id);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products?search=Bolo`,
        { headers: { cookie: `session_id=${sellerSession.token}` } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      const ids = body.products.map((p) => p.id);
      expect(ids).toContain(active.id);
      expect(ids).not.toContain(inactive.id);
    });

    test("Admin should see inactive products when explicitly filtered", async () => {
      const inactive = await pdvProduct.create({
        name: "Produto Admin Invisível",
        price_in_cents: 1000,
      });
      await pdvProduct.remove(inactive.id);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products?search=${encodeURIComponent("Produto Admin Invisível")}&is_active=false`,
        { headers: { cookie: `session_id=${adminSession.token}` } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      const ids = body.products.map((p) => p.id);
      expect(ids).toContain(inactive.id);
    });
  });

  describe("POST /api/v1/pdv/products/admin", () => {
    test("Admin should create a product", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({
            name: "Água com Gás",
            price_in_cents: 500,
            stock_quantity: 20,
          }),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Água com Gás");
      expect(body.stock_quantity).toBe(20);
    });

    test("Should return 400 for negative price_in_cents", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ name: "Preço Ruim", price_in_cents: -10 }),
        },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.name).toBe("ValidationError");
    });
  });

  describe("PUT /api/v1/pdv/products/admin/[id]", () => {
    test("Admin should update basic fields", async () => {
      const product = await pdvProduct.create({
        name: "Produto Para Editar",
        price_in_cents: 1000,
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ price_in_cents: 1500 }),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.price_in_cents).toBe(1500);
    });

    test("Should return 400 when stock_quantity is sent in the body", async () => {
      const product = await pdvProduct.create({
        name: "Produto Estoque Direto",
        price_in_cents: 1000,
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ stock_quantity: 999 }),
        },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.name).toBe("ValidationError");
    });
  });

  describe("DELETE /api/v1/pdv/products/admin/[id]", () => {
    test("Admin should soft-delete (inactivate) a product by default", async () => {
      const product = await pdvProduct.create({
        name: "Produto Para Remover",
        price_in_cents: 1000,
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.is_active).toBe(false);

      const stillThere = await pdvProduct.findById(product.id);
      expect(stillThere.id).toBe(product.id);
    });

    test("Admin should be able to reactivate an inactivated product", async () => {
      const product = await pdvProduct.create({
        name: "Produto Para Reativar",
        price_in_cents: 1000,
      });
      await pdvProduct.remove(product.id);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ is_active: true }),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.is_active).toBe(true);
    });

    test("Admin should permanently delete a product with ?hard=true", async () => {
      const product = await pdvProduct.create({
        name: "Produto Para Excluir De Verdade",
        price_in_cents: 1000,
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}?hard=true`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);

      await expect(pdvProduct.findById(product.id)).rejects.toThrow();
    });
  });

  describe("PATCH /api/v1/pdv/products/admin/[id]/stock", () => {
    test("Admin should increment stock", async () => {
      const product = await pdvProduct.create({
        name: "Produto Estoque Incrementar",
        price_in_cents: 1000,
        stock_quantity: 10,
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}/stock`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ delta_quantity: 5 }),
        },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stock_quantity).toBe(15);
    });

    test("Should return 409 when decrementing below zero without allow_negative_stock", async () => {
      const product = await pdvProduct.create({
        name: "Produto Estoque Insuficiente",
        price_in_cents: 1000,
        stock_quantity: 2,
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}/stock`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ delta_quantity: -5 }),
        },
      );
      expect(res.status).toBe(409);
    });

    test("Should respect max_negative_stock", async () => {
      const product = await pdvProduct.create({
        name: "Produto Estoque Negativo Limite",
        price_in_cents: 1000,
        stock_quantity: 2,
        allow_negative_stock: true,
        max_negative_stock: 3,
      });

      const withinLimit = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}/stock`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ delta_quantity: -5 }),
        },
      );
      expect(withinLimit.status).toBe(200);
      const withinBody = await withinLimit.json();
      expect(withinBody.stock_quantity).toBe(-3);

      const beyondLimit = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}/stock`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ delta_quantity: -1 }),
        },
      );
      expect(beyondLimit.status).toBe(409);
    });

    test("Should return 400 for delta_quantity equal to zero", async () => {
      const product = await pdvProduct.create({
        name: "Produto Delta Zero",
        price_in_cents: 1000,
        stock_quantity: 5,
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/products/admin/${product.id}/stock`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ delta_quantity: 0 }),
        },
      );
      expect(res.status).toBe(400);
    });
  });
});
