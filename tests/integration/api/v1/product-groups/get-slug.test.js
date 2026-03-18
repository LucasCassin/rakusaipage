import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import productGroupModel from "models/product_group.js";

let consumerSession;
let unauthorizedSession;
let expiredSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/product-groups/[slug]", () => {
  let activeGroup, inactiveGroup;

  beforeAll(async () => {
    // 1. Criar usuários
    const unauthorizedUser = await user.create({
      username: "noPerms",
      email: "no@test.com",
      password: "StrongPassword123@",
    });
    // Remove todas as features para garantir falta de acesso
    await user.removeFeatures(unauthorizedUser, unauthorizedUser.features);
    unauthorizedSession = await session.create(unauthorizedUser);

    let consumerUser = await user.create({
      username: "consumer",
      email: "consumer@test.com",
      password: "StrongPassword123@",
    });
    consumerUser = await user.update({
      id: consumerUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(consumerUser, ["shop:consumer:view"]);
    consumerSession = await session.create(consumerUser);

    const expiredUser = await user.create({
      username: "expired",
      email: "expired@test.com",
      password: "StrongPassword123@",
    });
    await user.addFeatures(expiredUser, ["shop:consumer:view"]);
    await user.expireUserPassword(expiredUser);
    expiredSession = await session.create(expiredUser);

    // 2. Criar Grupos para Teste
    activeGroup = await productGroupModel.create({
      name: "Camisetas de Verão",
      slug: "camisetas-verao",
      is_active: true,
    });

    inactiveGroup = await productGroupModel.create({
      name: "Coleção Secreta",
      slug: "colecao-secreta",
      is_active: false,
    });
  });

  describe("Security and Authorization", () => {
    test("Anonymous user should be able to read active groups", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/${activeGroup.slug}`,
      );
      expect(response.status).toBe(200);
    });

    test("Authenticated user without 'shop:consumer:view' should return 403", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/${activeGroup.slug}`,
        { headers: { cookie: `session_id=${unauthorizedSession.token}` } },
      );
      expect(response.status).toBe(403);
    });

    test("User with expired password should get 403 PasswordExpiredError", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/${activeGroup.slug}`,
        { headers: { cookie: `session_id=${expiredSession.token}` } },
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.name).toBe("PasswordExpiredError");
    });
  });

  describe("Validations and Business Logic", () => {
    test("Should return 200 and the group data for an ACTIVE group", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/${activeGroup.slug}`,
        { headers: { cookie: `session_id=${consumerSession.token}` } },
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.id).toBe(activeGroup.id);
      expect(body.name).toBe(activeGroup.name);
      expect(body.slug).toBe(activeGroup.slug);
      expect(body.is_active).toBe(true);
      expect(body.items).toBeDefined(); // O array de produtos aninhados
    });

    test("Should return 404 NotFound when trying to access an INACTIVE group", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/${inactiveGroup.slug}`,
        { headers: { cookie: `session_id=${consumerSession.token}` } },
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.name).toBe("NotFoundError");
      expect(body.message).toBe("Coleção ou grupo não encontrado.");
    });

    test("Should return 404 NotFound for a slug that does not exist", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/slug-inventado-que-nao-existe`,
        { headers: { cookie: `session_id=${consumerSession.token}` } },
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.name).toBe("NotFoundError");
    });
  });
});
