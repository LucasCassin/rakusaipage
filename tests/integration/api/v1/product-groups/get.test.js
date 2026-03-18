import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import productGroup from "models/product_group.js";
import session from "models/session.js";

describe("Test GET /api/v1/product-groups", () => {
  let adminSession;
  let consumerSession;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // Admin (para testar visão completa e filtros)
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

    // Usuário consumidor (tem acesso à loja, mas não gerencia)
    let standardUser = await user.create({
      username: "consumer",
      email: "consumer@test.com",
      password: "StrongPassword123@",
    });
    standardUser = await user.update({
      id: standardUser.id,
      password: "StrongPassword123@",
    });
    standardUser = await user.addFeatures(standardUser, ["shop:consumer:view"]);
    consumerSession = await session.create(standardUser);

    // Cria alguns grupos para teste
    await productGroup.create({
      name: "Grupo Ativo",
      slug: "group-active",
      description: "Ativo",
      images: [],
      is_active: true,
    });

    await productGroup.create({
      name: "Grupo Inativo",
      slug: "group-inactive",
      description: "Inativo",
      images: [],
      is_active: false,
    });

    await productGroup.create({
      name: "Grupo Busca",
      slug: "group-search",
      description: "Busca",
      images: [],
      is_active: true,
    });
  });

  describe("Access control", () => {
    test("Should return 403 if user lacks 'shop:consumer:view'", async () => {
      let blockedUser = await user.create({
        username: "blocked",
        email: "blocked@test.com",
        password: "StrongPassword123@",
      });
      await user.removeFeatures(blockedUser, blockedUser.features);
      const blockedSession = await session.create(blockedUser);

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          headers: { cookie: `session_id=${blockedSession.token}` },
        },
      );

      expect(response.status).toBe(403);
    });

    test("Anonymous user should only see active groups", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
      );
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.groups.some((g) => g.slug === "group-inactive")).toBe(false);
      expect(body.groups.some((g) => g.slug === "group-active")).toBe(true);
    });

    test("Consumer should only see active groups", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          headers: { cookie: `session_id=${consumerSession.token}` },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups.some((g) => g.slug === "group-inactive")).toBe(false);
      expect(body.groups.some((g) => g.slug === "group-active")).toBe(true);
    });

    test("Admin should see inactive groups by default", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups.some((g) => g.slug === "group-inactive")).toBe(true);
    });
  });

  describe("Filtering & pagination", () => {
    test("Admin can filter by is_active=false", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups?is_active=false`,
        {
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups).toHaveLength(1);
      expect(body.groups[0].slug).toBe("group-inactive");
    });

    test("Admin can search by name/slug", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups?search=Busca`,
        {
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups).toHaveLength(1);
      expect(body.groups[0].slug).toBe("group-search");
    });

    test("Supports pagination (limit/offset)", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups?limit=1&offset=1`,
        {
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.groups).toHaveLength(1);
    });
  });
});
