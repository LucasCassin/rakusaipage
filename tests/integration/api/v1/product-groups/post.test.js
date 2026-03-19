import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";

let adminSession;
let consumerSession;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  // Admin padrão (já existente nas sementes do projeto)
  let adminUser = await user.findOneUser({ username: "mainUser" });
  adminUser = await user.update({
    id: adminUser.id,
    password: "StrongPassword123@",
  });
  await user.addFeatures(adminUser, [
    "shop:products:manage",
    "shop:consumer:view",
  ]);
  adminSession = await session.create(adminUser);

  // Usuário consumidor (não tem permissão de gerenciamento)
  let consumerUser = await user.create({
    username: "consumerUser",
    email: "consumer@test.com",
    password: "Password123@",
  });
  consumerUser = await user.update({
    id: consumerUser.id,
    password: "Password123@",
  });
  await user.addFeatures(consumerUser, ["shop:consumer:view"]);
  consumerSession = await session.create(consumerUser);
});

describe("POST /api/v1/product-groups", () => {
  describe("Anonymous user", () => {
    test("Should return 403 Forbidden", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Grupo Teste",
            slug: "grupo-teste",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ForbiddenError");
    });
  });

  describe("Authenticated user without 'shop:products:manage' feature", () => {
    test("Should return 403 Forbidden", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${consumerSession.token}`,
          },
          body: JSON.stringify({
            name: "Grupo Teste",
            slug: "grupo-teste",
          }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ForbiddenError");
    });
  });

  describe("Authenticated admin user (with 'shop:products:manage')", () => {
    test("Should create a product group with valid data", async () => {
      const groupData = {
        name: "Camisetas Básicas",
        slug: "camisetas-basicas",
        description: "A nossa linha principal de camisetas.",
        images: [
          {
            url: "http://example.com/url-imagem.jpg",
            alt: "thumb",
            is_cover: true,
          },
        ],
        is_active: true,
      };

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(groupData),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody.id).toBeDefined();
      expect(responseBody.name).toBe(groupData.name);
      expect(responseBody.slug).toBe(groupData.slug);
      expect(responseBody.description).toBe(groupData.description);
      expect(responseBody.images).toEqual(groupData.images);
      expect(responseBody.is_active).toBe(true);
      expect(responseBody.created_at).toBeDefined();
    });

    test("Should create a product group with defaults (is_active=true, images=[])", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({
            name: "Camisetas Básicas 2",
            slug: "camisetas-basicas-2",
          }),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody.is_active).toBe(true);
      expect(responseBody.images).toEqual([]);
    });

    test("Should ignore unknown fields when creating a group", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({
            name: "Camisetas Básicas 3",
            slug: "camisetas-basicas-3",
            foo: "bar",
          }),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.foo).toBeUndefined();
    });

    test("Should return 400 when trying to create a group with an existing slug", async () => {
      const groupData = {
        name: "Outras Camisetas",
        slug: "camisetas-basicas", // Mesmo slug do teste anterior
      };

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(groupData),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.message).toBe(
        "Já existe um grupo com este slug (URL).",
      );
    });

    test("Should return 400 when required fields are missing", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({
            description: "Falta o nome e o slug",
          }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });
  });
});
