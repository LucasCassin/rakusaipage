import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import product from "models/product.js";
import session from "models/session.js";

describe("Test GET /api/v1/products", () => {
  let adminSession, userSession, vipSession;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Admin (Para criar os produtos inicialmente e testar visão total)
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

    // 2. Usuário Comum (Tem acesso à loja, mas não é nível avançado)
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

    // 3. Usuário VIP (Tem acesso à loja E nível avançado)
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

    // --- SETUP DO BANCO ---

    // Produto A: Público (allowed_features: [])
    await product.create({
      name: "Camiseta Básica",
      slug: "basic",
      description: "...",
      category: "Test",
      price_in_cents: 1000,
      minimum_price_in_cents: 100,
      stock_quantity: 10,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      allowed_features: [], // Visível para todos com shop:consumer:view
      is_active: true,
      images: [],
    });

    // Produto B: Restrito (allowed_features: ['nivel:taiko:avancado'])
    await product.create({
      name: "Bachi Master",
      slug: "master",
      description: "...",
      category: "Test",
      price_in_cents: 5000,
      minimum_price_in_cents: 100,
      stock_quantity: 10,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      allowed_features: ["nivel:taiko:avancado"], // Apenas VIPs
      is_active: true,
      images: [],
    });
  });

  describe("Access Control", () => {
    test("Should return 403 if user lacks 'shop:consumer:view'", async () => {
      // Cria usuário sem a feature de loja
      let blockedUser = await user.create({
        username: "blocked",
        email: "block@test.com",
        password: "StrongPassword123@",
      });
      // Removemos todas as features para garantir
      await user.removeFeatures(blockedUser, blockedUser.features);
      const blockedSession = await session.create(blockedUser);

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products`,
        {
          headers: { cookie: `session_id=${blockedSession.token}` },
        },
      );
      expect(response.status).toBe(403);
    });

    test("Standard user should ONLY see public products", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products`,
        {
          headers: { cookie: `session_id=${userSession.token}` },
        },
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.products).toHaveLength(1);
      expect(body.products[0].slug).toBe("basic");

      // Garante que o restrito não veio
      const hasVipProduct = body.products.some((p) => p.slug === "master");
      expect(hasVipProduct).toBe(false);
    });

    test("VIP user should see BOTH public and restricted products", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products`,
        {
          headers: { cookie: `session_id=${vipSession.token}` },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.products).toHaveLength(2);

      const slugs = body.products.map((p) => p.slug).sort();
      expect(slugs).toEqual(["basic", "master"]);
    });

    test("Admin should see everything regardless of features", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products`,
        {
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const body = await response.json();
      expect(body.products).toHaveLength(2);
    });
  });
});
