import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import product from "models/product.js";
import session from "models/session.js";

describe("Test GET /api/v1/products/[slug]", () => {
  let adminSession, userSession, vipSession;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Admin
    let adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    adminUser = await user.addFeatures(adminUser, [
      "shop:products:manage",
      "shop:consumer:view",
    ]);
    adminSession = await session.create(adminUser);

    // 2. Standard User
    let standardUser = await user.create({
      username: "std",
      email: "std@test.com",
      password: "StrongPassword123@",
    });
    standardUser = await user.update({
      id: standardUser.id,
      password: "StrongPassword123@",
    });
    standardUser = await user.addFeatures(standardUser, ["shop:consumer:view"]);
    userSession = await session.create(standardUser);

    // 3. VIP User
    let vipUser = await user.create({
      username: "vip",
      email: "vip@test.com",
      password: "StrongPassword123@",
    });
    vipUser = await user.update({
      id: vipUser.id,
      password: "StrongPassword123@",
    });
    vipUser = await user.addFeatures(vipUser, [
      "shop:consumer:view",
      "nivel:taiko:avancado",
    ]);
    vipSession = await session.create(vipUser);

    // --- PRODUTOS ---
    await product.create({
      name: "Produto Público",
      slug: "publico",
      description: "...",
      category: "Test",
      price_in_cents: 1000,
      minimum_price_in_cents: 100,
      stock_quantity: 10,
      weight_in_grams: 10,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      is_active: true,
      allowed_features: [],
      images: [],
    });

    await product.create({
      name: "Produto VIP",
      slug: "vip-only",
      description: "...",
      category: "Test",
      price_in_cents: 1000,
      minimum_price_in_cents: 100,
      stock_quantity: 10,
      weight_in_grams: 10,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      is_active: true,
      allowed_features: ["nivel:taiko:avancado"],
      images: [],
    });

    await product.create({
      name: "Produto Inativo",
      slug: "inativo",
      description: "...",
      category: "Test",
      price_in_cents: 1000,
      minimum_price_in_cents: 100,
      stock_quantity: 10,
      weight_in_grams: 10,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      is_active: false,
      allowed_features: [],
      images: [],
    });
  });

  describe("Permissions Logic", () => {
    test("Everyone should see public product", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products/publico`,
        {
          headers: { cookie: `session_id=${userSession.token}` },
        },
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.slug).toBe("publico");
    });

    test("Standard user should get 403 Forbidden on VIP product", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products/vip-only`,
        {
          headers: { cookie: `session_id=${userSession.token}` },
        },
      );
      expect(response.status).toBe(403);
    });

    test("VIP user should see VIP product", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products/vip-only`,
        {
          headers: { cookie: `session_id=${vipSession.token}` },
        },
      );
      expect(response.status).toBe(200);
    });

    test("Standard user should get 404 on Inactive product", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products/inativo`,
        {
          headers: { cookie: `session_id=${userSession.token}` },
        },
      );
      // Importante: Usuário comum recebe 404 (não existe) para não saber que o produto está escondido
      expect(response.status).toBe(404);
    });

    test("Admin should see Inactive product", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products/inativo`,
        {
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      expect(response.status).toBe(200);
    });
  });
});
