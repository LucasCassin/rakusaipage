import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import pdvProduct from "models/pdv_product.js";
import pdvPaymentMethod from "models/pdv_payment_method.js";
import pdvSale from "models/pdv_sale.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("API /api/v1/pdv/sales/[id]/cancel", () => {
  let cancelSession,
    sellerSession,
    sellerUser,
    unauthorizedSession,
    expiredSession;
  let cash;

  beforeAll(async () => {
    const adminUser = await user.findOneUser({ username: "mainUser" });
    const updatedAdmin = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(updatedAdmin, ["pdv:sales:cancel"]);
    cancelSession = await session.create(updatedAdmin);

    let sellerA = await user.create({
      username: "pdvCancelSeller",
      email: "pdv-cancel-seller@test.com",
      password: "StrongPassword123@",
    });
    sellerA = await user.update({
      id: sellerA.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(sellerA, ["pdv:sell"]);
    sellerUser = sellerA;
    sellerSession = await session.create(sellerA);

    let unauthorizedUser = await user.create({
      username: "pdvCancelNoPerms",
      email: "pdv-cancel-noperms@test.com",
      password: "StrongPassword123@",
    });
    unauthorizedUser = await user.update({
      id: unauthorizedUser.id,
      password: "StrongPassword123@",
    });
    await user.removeFeatures(unauthorizedUser, unauthorizedUser.features);
    unauthorizedSession = await session.create(unauthorizedUser);

    const expiredUser = await user.create({
      username: "pdvCancelExpired",
      email: "pdv-cancel-expired@test.com",
      password: "StrongPassword123@",
    });
    await user.addFeatures(expiredUser, ["pdv:sales:cancel"]);
    await user.expireUserPassword(expiredUser);
    expiredSession = await session.create(expiredUser);

    cash = await pdvPaymentMethod.create({ name: "Dinheiro Rota Cancel" });
  });

  const createSale = async (suffix, stock = 10) => {
    const product = await pdvProduct.create({
      name: `Produto Cancel ${suffix}`,
      price_in_cents: 1000,
      stock_quantity: stock,
    });
    const sale = await pdvSale.create({
      sellerId: sellerUser.id,
      items: [{ product_id: product.id, quantity: 4 }],
      paymentMethodId: cash.id,
    });
    return { product, sale };
  };

  describe("Security Check", () => {
    test("Anonymous user should get 403", async () => {
      const { sale } = await createSale("anon");
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}/cancel`,
        { method: "POST" },
      );
      expect(res.status).toBe(403);
    });

    test("Seller without pdv:sales:cancel should get 403, even as the sale owner", async () => {
      const { sale } = await createSale("owner-no-cancel-feature");
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sellerSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );
      expect(res.status).toBe(403);
    });

    test("User with expired password should get 403 PasswordExpiredError", async () => {
      const { sale } = await createSale("expired");
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${expiredSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.name).toBe("PasswordExpiredError");
    });

    test("User without any pdv feature should get 403", async () => {
      const { sale } = await createSale("noperms");
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${unauthorizedSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/pdv/sales/[id]/cancel", () => {
    test("Should cancel a sale and restock its items", async () => {
      const { product, sale } = await createSale("happy", 10);

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${cancelSession.token}`,
          },
          body: JSON.stringify({ reason: "Pedido duplicado" }),
        },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("cancelled");
      expect(body.cancel_reason).toBe("Pedido duplicado");

      const restocked = await pdvProduct.findById(product.id);
      expect(restocked.stock_quantity).toBe(10);
    });

    test("Should return 400 when cancelling an already cancelled sale", async () => {
      const { sale } = await createSale("double-cancel");

      await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${cancelSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );

      const secondRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${cancelSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );
      expect(secondRes.status).toBe(400);
    });

    test("Should return 404 when cancelling a non-existent sale", async () => {
      const fakeUUID = orchestrator.generateRandomUUIDV4();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${fakeUUID}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${cancelSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );
      expect(res.status).toBe(404);
    });
  });
});
