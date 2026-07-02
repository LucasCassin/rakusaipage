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

describe("API /api/v1/pdv/sales", () => {
  let sellerASession,
    sellerAUser,
    sellerBSession,
    sellerBUser,
    reportsSession,
    unauthorizedSession,
    expiredSession;
  let cash, card, cardVariant;

  beforeAll(async () => {
    let sellerA = await user.create({
      username: "pdvSalesSellerA",
      email: "pdv-sales-seller-a@test.com",
      password: "StrongPassword123@",
    });
    sellerA = await user.update({
      id: sellerA.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(sellerA, ["pdv:sell"]);
    sellerAUser = sellerA;
    sellerASession = await session.create(sellerA);

    let sellerB = await user.create({
      username: "pdvSalesSellerB",
      email: "pdv-sales-seller-b@test.com",
      password: "StrongPassword123@",
    });
    sellerB = await user.update({
      id: sellerB.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(sellerB, ["pdv:sell"]);
    sellerBUser = sellerB;
    sellerBSession = await session.create(sellerB);

    const reportsAdmin = await user.findOneUser({ username: "mainUser" });
    const updatedReportsAdmin = await user.update({
      id: reportsAdmin.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(updatedReportsAdmin, ["pdv:reports:read"]);
    reportsSession = await session.create(updatedReportsAdmin);

    let unauthorizedUser = await user.create({
      username: "pdvSalesNoPerms",
      email: "pdv-sales-noperms@test.com",
      password: "StrongPassword123@",
    });
    unauthorizedUser = await user.update({
      id: unauthorizedUser.id,
      password: "StrongPassword123@",
    });
    await user.removeFeatures(unauthorizedUser, unauthorizedUser.features);
    unauthorizedSession = await session.create(unauthorizedUser);

    const expiredUser = await user.create({
      username: "pdvSalesExpired",
      email: "pdv-sales-expired@test.com",
      password: "StrongPassword123@",
    });
    await user.addFeatures(expiredUser, ["pdv:sell"]);
    await user.expireUserPassword(expiredUser);
    expiredSession = await session.create(expiredUser);

    cash = await pdvPaymentMethod.create({ name: "Dinheiro Rota Sales" });
    card = await pdvPaymentMethod.create({ name: "Cartão Rota Sales" });
    cardVariant = await pdvPaymentMethod.createVariant(card.id, {
      name: "Máquina Rota Sales",
    });
  });

  const createProduct = (suffix, overrides = {}) =>
    pdvProduct.create({
      name: `Produto Rota ${suffix}`,
      price_in_cents: 1000,
      stock_quantity: 20,
      ...overrides,
    });

  describe("Security Check", () => {
    test("Anonymous user should get 403 on POST", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
    });

    test("User without pdv:sell should get 403 on POST", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${unauthorizedSession.token}`,
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
    });

    test("User with expired password should get 403 PasswordExpiredError on POST", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${expiredSession.token}`,
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.name).toBe("PasswordExpiredError");
    });

    test("Seller (pdv:sell only) should get 403 on GET listing", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        headers: { cookie: `session_id=${sellerASession.token}` },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/pdv/sales", () => {
    test("Should create a sale without discount, in cash", async () => {
      const product = await createProduct("post-happy");

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 2 }],
          payments: [
            {
              payment_method_id: cash.id,
              amount_in_cents: 2000,
              cash_given_in_cents: 3000,
            },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.subtotal_in_cents).toBe(2000);
      expect(body.total_in_cents).toBe(2000);
      expect(body.payments).toHaveLength(1);
      expect(body.payments[0].change_in_cents).toBe(1000);
      expect(body.seller_id).toBe(sellerAUser.id);
    });

    test("Should store an optional notes field (e.g. raffle contact info)", async () => {
      const product = await createProduct("post-notes");

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [{ payment_method_id: cash.id, amount_in_cents: 1000 }],
          notes: "Maria Silva - (11) 99999-0000 - sorteio",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.notes).toBe("Maria Silva - (11) 99999-0000 - sorteio");
    });

    test("Should return 400 when the payment method has variants and none was selected", async () => {
      const product = await createProduct("post-variant-required");

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [{ payment_method_id: card.id, amount_in_cents: 1000 }],
        }),
      });

      expect(res.status).toBe(400);
    });

    test("Should create a sale with a percentage discount", async () => {
      const product = await createProduct("post-discount");

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 10 }],
          discount_type: "percentage",
          discount_value: 10,
          payments: [{ payment_method_id: cash.id, amount_in_cents: 9000 }],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.discount_in_cents).toBe(1000);
      expect(body.total_in_cents).toBe(9000);
    });

    test("Should return 400 for discount percentage above 100", async () => {
      const product = await createProduct("post-bad-discount");

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          discount_type: "percentage",
          discount_value: 200,
          payments: [{ payment_method_id: cash.id, amount_in_cents: 1000 }],
        }),
      });
      expect(res.status).toBe(400);
    });

    test("Should return 400 when cash given is insufficient", async () => {
      const product = await createProduct("post-insufficient-cash");

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [
            {
              payment_method_id: cash.id,
              amount_in_cents: 1000,
              cash_given_in_cents: 500,
            },
          ],
        }),
      });
      expect(res.status).toBe(400);
    });

    test("Should return 404 for a non-existent payment method", async () => {
      const product = await createProduct("post-bad-method");
      const fakeUUID = orchestrator.generateRandomUUIDV4();

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [{ payment_method_id: fakeUUID, amount_in_cents: 1000 }],
        }),
      });
      expect(res.status).toBe(404);
    });

    test("Should return 400 when the variant does not belong to the payment method", async () => {
      const product = await createProduct("post-bad-variant");

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [
            {
              // "Dinheiro", não é dono da variante do cartão
              payment_method_id: cash.id,
              payment_method_variant_id: cardVariant.id,
              amount_in_cents: 1000,
            },
          ],
        }),
      });
      expect(res.status).toBe(400);
    });

    test("Should create a sale with a valid variant", async () => {
      const product = await createProduct("post-good-variant");

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [
            {
              payment_method_id: card.id,
              payment_method_variant_id: cardVariant.id,
              amount_in_cents: 1000,
            },
          ],
        }),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.payments[0].payment_method_variant_id).toBe(cardVariant.id);
    });

    test("Should create a sale split across two payment methods", async () => {
      const product = await createProduct("post-split", {
        price_in_cents: 10000,
      });

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [
            { payment_method_id: cash.id, amount_in_cents: 4000 },
            {
              payment_method_id: card.id,
              payment_method_variant_id: cardVariant.id,
              amount_in_cents: 6000,
            },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.payments).toHaveLength(2);
      const sum = body.payments.reduce((acc, p) => acc + p.amount_in_cents, 0);
      expect(sum).toBe(10000);
    });

    test("Should return 400 when split payments do not add up to the total", async () => {
      const product = await createProduct("post-split-bad-sum", {
        price_in_cents: 10000,
      });

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [
            { payment_method_id: cash.id, amount_in_cents: 4000 },
            {
              payment_method_id: card.id,
              payment_method_variant_id: cardVariant.id,
              amount_in_cents: 5000,
            },
          ],
        }),
      });
      expect(res.status).toBe(400);
    });

    test("Should return 404 for a non-existent product", async () => {
      const fakeUUID = orchestrator.generateRandomUUIDV4();

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: fakeUUID, quantity: 1 }],
          payments: [{ payment_method_id: cash.id, amount_in_cents: 1000 }],
        }),
      });
      expect(res.status).toBe(404);
    });

    test("Should return 400 for an inactive product", async () => {
      const product = await createProduct("post-inactive");
      await pdvProduct.remove(product.id);

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [{ payment_method_id: cash.id, amount_in_cents: 1000 }],
        }),
      });
      expect(res.status).toBe(400);
    });

    test("Should return 409 for insufficient stock and persist nothing", async () => {
      const product = await createProduct("post-insufficient-stock", {
        stock_quantity: 1,
      });

      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sellerASession.token}`,
        },
        body: JSON.stringify({
          items: [{ product_id: product.id, quantity: 5 }],
          payments: [{ payment_method_id: cash.id, amount_in_cents: 5000 }],
        }),
      });
      expect(res.status).toBe(409);

      const unchanged = await pdvProduct.findById(product.id);
      expect(unchanged.stock_quantity).toBe(1);
    });

    test("Concurrent sales should never oversell the same product", async () => {
      const product = await createProduct("post-concurrency", {
        stock_quantity: 5,
      });

      const attempts = Array.from({ length: 10 }, () =>
        fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sellerASession.token}`,
          },
          body: JSON.stringify({
            items: [{ product_id: product.id, quantity: 1 }],
            payments: [{ payment_method_id: cash.id, amount_in_cents: 1000 }],
          }),
        }),
      );

      const responses = await Promise.all(attempts);
      const statuses = responses.map((r) => r.status);
      const successCount = statuses.filter((s) => s === 201).length;
      const conflictCount = statuses.filter((s) => s === 409).length;

      expect(successCount).toBe(5);
      expect(conflictCount).toBe(5);

      const finalProduct = await pdvProduct.findById(product.id);
      expect(finalProduct.stock_quantity).toBe(0);
    });
  });

  describe("GET /api/v1/pdv/sales", () => {
    test("User with pdv:reports:read should list sales", async () => {
      const res = await fetch(`${orchestrator.webserverUrl}/api/v1/pdv/sales`, {
        headers: { cookie: `session_id=${reportsSession.token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.sales)).toBe(true);
    });
  });

  describe("GET /api/v1/pdv/sales/[id]", () => {
    test("Owner seller should be able to view their own sale", async () => {
      const product = await createProduct("get-owner");
      const sale = await pdvSale.create({
        sellerId: sellerAUser.id,
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [{ payment_method_id: cash.id, amount_in_cents: 1000 }],
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}`,
        { headers: { cookie: `session_id=${sellerASession.token}` } },
      );
      expect(res.status).toBe(200);
    });

    test("A different seller should get 403 when viewing someone else's sale", async () => {
      const product = await createProduct("get-not-owner");
      const sale = await pdvSale.create({
        sellerId: sellerAUser.id,
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [{ payment_method_id: cash.id, amount_in_cents: 1000 }],
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}`,
        { headers: { cookie: `session_id=${sellerBSession.token}` } },
      );
      expect(res.status).toBe(403);
    });

    test("User with pdv:reports:read should view any sale", async () => {
      const product = await createProduct("get-reports");
      const sale = await pdvSale.create({
        sellerId: sellerBUser.id,
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [{ payment_method_id: cash.id, amount_in_cents: 1000 }],
      });

      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales/${sale.id}`,
        { headers: { cookie: `session_id=${reportsSession.token}` } },
      );
      expect(res.status).toBe(200);
    });
  });
});
