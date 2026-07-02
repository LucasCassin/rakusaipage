import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import pdvPaymentMethod from "models/pdv_payment_method.js";
import pdvProduct from "models/pdv_product.js";
import pdvSale from "models/pdv_sale.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("API /api/v1/pdv/payment-methods", () => {
  let adminSession,
    sellerSession,
    sellerUser,
    unauthorizedSession,
    expiredSession;

  beforeAll(async () => {
    const adminUser = await user.findOneUser({ username: "mainUser" });
    const updatedAdmin = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(updatedAdmin, ["pdv:payment_methods:manage"]);
    adminSession = await session.create(updatedAdmin);

    sellerUser = await user.create({
      username: "pdvPmSeller",
      email: "pdv-pm-seller@test.com",
      password: "StrongPassword123@",
    });
    sellerUser = await user.update({
      id: sellerUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(sellerUser, ["pdv:sell"]);
    sellerSession = await session.create(sellerUser);

    let unauthorizedUser = await user.create({
      username: "pdvPmNoPerms",
      email: "pdv-pm-noperms@test.com",
      password: "StrongPassword123@",
    });
    unauthorizedUser = await user.update({
      id: unauthorizedUser.id,
      password: "StrongPassword123@",
    });
    await user.removeFeatures(unauthorizedUser, unauthorizedUser.features);
    unauthorizedSession = await session.create(unauthorizedUser);

    const expiredUser = await user.create({
      username: "pdvPmExpired",
      email: "pdv-pm-expired@test.com",
      password: "StrongPassword123@",
    });
    await user.addFeatures(expiredUser, ["pdv:payment_methods:manage"]);
    await user.expireUserPassword(expiredUser);
    expiredSession = await session.create(expiredUser);
  });

  describe("Security Check", () => {
    test("Anonymous user should get 403 on GET", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods`,
      );
      expect(res.status).toBe(403);
    });

    test("User without feature should get 403 on GET", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods`,
        { headers: { cookie: `session_id=${unauthorizedSession.token}` } },
      );
      expect(res.status).toBe(403);
    });

    test("User with expired password should get 403 PasswordExpiredError", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods`,
        { headers: { cookie: `session_id=${expiredSession.token}` } },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.name).toBe("PasswordExpiredError");
    });

    test("Seller should get 403 on POST admin", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sellerSession.token}`,
          },
          body: JSON.stringify({ name: "Hack" }),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/pdv/payment-methods/admin", () => {
    test("Admin should create a payment method", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ name: "Pix Teste" }),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Pix Teste");
    });

    test("Should return 400 for a duplicate name", async () => {
      await pdvPaymentMethod.create({ name: "Duplicado Rota" });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ name: "Duplicado Rota" }),
        },
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.name).toBe("ValidationError");
    });
  });

  describe("Variants", () => {
    test("Admin should create a variant for a payment method", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Cartão Rota Teste",
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/${method.id}/variants`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ name: "Máquina Azul" }),
        },
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe("Máquina Azul");
      expect(body.payment_method_id).toBe(method.id);
    });

    test("Should return 404 for a non-existent payment method", async () => {
      const fakeUUID = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/${fakeUUID}/variants`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ name: "Máquina Fantasma" }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE (cascade) /api/v1/pdv/payment-methods/admin/[id]", () => {
    test("Should deactivate method and its variants when listed by a seller", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Cascata Rota",
      });
      await pdvPaymentMethod.createVariant(method.id, {
        name: "Variante Cascata Rota",
      });

      const deleteRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/${method.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(deleteRes.status).toBe(200);

      const listRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods`,
        { headers: { cookie: `session_id=${sellerSession.token}` } },
      );
      const listBody = await listRes.json();
      const ids = listBody.map((pm) => pm.id);
      expect(ids).not.toContain(method.id);
    });

    test("Admin should be able to reactivate an inactivated payment method", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Para Reativar Rota",
      });
      await pdvPaymentMethod.remove(method.id);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/${method.id}`,
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

    test("Admin should permanently delete a payment method with ?hard=true", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Para Excluir De Verdade Rota",
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/${method.id}?hard=true`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);

      await expect(pdvPaymentMethod.findById(method.id)).rejects.toThrow();
    });
  });

  describe("DELETE /api/v1/pdv/payment-methods/admin/variants/[variantId]", () => {
    test("Admin should permanently delete a variant", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Variante Excluir Rota",
      });
      const variant = await pdvPaymentMethod.createVariant(method.id, {
        name: "Variante Excluir Rota",
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/variants/${variant.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(res.status).toBe(200);

      await expect(
        pdvPaymentMethod.findVariantById(variant.id),
      ).rejects.toThrow();
    });
  });

  describe("GET .../admin/[id]/usage and .../admin/variants/[variantId]/usage", () => {
    test("Should report in_use: false for a method/variant never sold", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Nunca Vendida Rota",
      });
      const variant = await pdvPaymentMethod.createVariant(method.id, {
        name: "Variante Nunca Vendida Rota",
      });

      const methodRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/${method.id}/usage`,
        { headers: { cookie: `session_id=${adminSession.token}` } },
      );
      expect(methodRes.status).toBe(200);
      expect((await methodRes.json()).in_use).toBe(false);

      const variantRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/variants/${variant.id}/usage`,
        { headers: { cookie: `session_id=${adminSession.token}` } },
      );
      expect(variantRes.status).toBe(200);
      expect((await variantRes.json()).in_use).toBe(false);
    });

    test("Should report in_use: true for a method/variant referenced by a sale", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Vendida Rota",
      });
      const variant = await pdvPaymentMethod.createVariant(method.id, {
        name: "Variante Vendida Rota",
      });
      const product = await pdvProduct.create({
        name: "Produto Forma Usage Rota",
        price_in_cents: 1000,
        stock_quantity: 10,
      });
      await pdvSale.create({
        sellerId: sellerUser.id,
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [
          {
            payment_method_id: method.id,
            payment_method_variant_id: variant.id,
            amount_in_cents: 1000,
          },
        ],
      });

      const methodRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/${method.id}/usage`,
        { headers: { cookie: `session_id=${adminSession.token}` } },
      );
      expect((await methodRes.json()).in_use).toBe(true);

      const variantRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/variants/${variant.id}/usage`,
        { headers: { cookie: `session_id=${adminSession.token}` } },
      );
      expect((await variantRes.json()).in_use).toBe(true);
    });

    test("Seller (pdv:sell only) should get 403 on both", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Usage Sem Permissao",
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/payment-methods/admin/${method.id}/usage`,
        { headers: { cookie: `session_id=${sellerSession.token}` } },
      );
      expect(res.status).toBe(403);
    });
  });
});
