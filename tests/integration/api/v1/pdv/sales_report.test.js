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

describe("API /api/v1/pdv/sales_report", () => {
  let reportsSession, sellerA, sellerB, unauthorizedSession, expiredSession;
  let cash, card, cardVariant, productX, productY;

  beforeAll(async () => {
    const adminUser = await user.findOneUser({ username: "mainUser" });
    const updatedAdmin = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(updatedAdmin, ["pdv:reports:read"]);
    reportsSession = await session.create(updatedAdmin);

    let sellerAUser = await user.create({
      username: "pdvReportSellerA",
      email: "pdv-report-seller-a@test.com",
      password: "StrongPassword123@",
    });
    sellerAUser = await user.update({
      id: sellerAUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(sellerAUser, ["pdv:sell"]);
    sellerA = sellerAUser;

    let sellerBUser = await user.create({
      username: "pdvReportSellerB",
      email: "pdv-report-seller-b@test.com",
      password: "StrongPassword123@",
    });
    sellerBUser = await user.update({
      id: sellerBUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(sellerBUser, ["pdv:sell"]);
    sellerB = sellerBUser;

    let unauthorizedUser = await user.create({
      username: "pdvReportNoPerms",
      email: "pdv-report-noperms@test.com",
      password: "StrongPassword123@",
    });
    unauthorizedUser = await user.update({
      id: unauthorizedUser.id,
      password: "StrongPassword123@",
    });
    await user.removeFeatures(unauthorizedUser, unauthorizedUser.features);
    unauthorizedSession = await session.create(unauthorizedUser);

    const expiredUser = await user.create({
      username: "pdvReportExpired",
      email: "pdv-report-expired@test.com",
      password: "StrongPassword123@",
    });
    await user.addFeatures(expiredUser, ["pdv:reports:read"]);
    await user.expireUserPassword(expiredUser);
    expiredSession = await session.create(expiredUser);

    cash = await pdvPaymentMethod.create({ name: "Dinheiro Report Rota" });
    card = await pdvPaymentMethod.create({ name: "Cartão Report Rota" });
    cardVariant = await pdvPaymentMethod.createVariant(card.id, {
      name: "Máquina Report Rota",
    });

    productX = await pdvProduct.create({
      name: "Produto Report Rota X",
      price_in_cents: 1000,
      stock_quantity: 1000,
    });
    productY = await pdvProduct.create({
      name: "Produto Report Rota Y",
      price_in_cents: 2000,
      stock_quantity: 1000,
    });

    await pdvSale.create({
      sellerId: sellerA.id,
      items: [{ product_id: productX.id, quantity: 2 }],
      payments: [{ payment_method_id: cash.id, amount_in_cents: 2000 }],
    });

    await pdvSale.create({
      sellerId: sellerB.id,
      items: [{ product_id: productY.id, quantity: 1 }],
      payments: [
        {
          payment_method_id: card.id,
          payment_method_variant_id: cardVariant.id,
          amount_in_cents: 2000,
        },
      ],
    });
  });

  describe("Security Check", () => {
    test("Anonymous user should get 403", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales_report`,
      );
      expect(res.status).toBe(403);
    });

    test("User without pdv:reports:read should get 403", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales_report`,
        { headers: { cookie: `session_id=${unauthorizedSession.token}` } },
      );
      expect(res.status).toBe(403);
    });

    test("User with expired password should get 403 PasswordExpiredError", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales_report`,
        { headers: { cookie: `session_id=${expiredSession.token}` } },
      );
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.name).toBe("PasswordExpiredError");
    });
  });

  describe("GET /api/v1/pdv/sales_report", () => {
    test("Should filter by a single product", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales_report?product_ids=${productX.id}`,
        { headers: { cookie: `session_id=${reportsSession.token}` } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.summary.sales_count).toBe(1);
    });

    test("Should filter by multiple products (comma-separated)", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales_report?product_ids=${productX.id},${productY.id}`,
        { headers: { cookie: `session_id=${reportsSession.token}` } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.summary.sales_count).toBe(2);
    });

    test("Should filter by date range", async () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales_report?start_date=${encodeURIComponent(future)}`,
        { headers: { cookie: `session_id=${reportsSession.token}` } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.summary.sales_count).toBe(0);
    });

    test("Should filter by payment method", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales_report?payment_method_id=${card.id}`,
        { headers: { cookie: `session_id=${reportsSession.token}` } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.summary.sales_count).toBe(1);
    });

    test("Should filter by payment method variant", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales_report?payment_method_variant_id=${cardVariant.id}`,
        { headers: { cookie: `session_id=${reportsSession.token}` } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.summary.sales_count).toBe(1);
    });

    test("Should filter by seller", async () => {
      const res = await fetch(
        `${orchestrator.webserverUrl}/api/v1/pdv/sales_report?seller_id=${sellerB.id}`,
        { headers: { cookie: `session_id=${reportsSession.token}` } },
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.summary.sales_count).toBe(1);
      expect(body.by_seller[0].seller_id).toBe(sellerB.id);
    });
  });
});
