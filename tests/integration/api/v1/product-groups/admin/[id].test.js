import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import productGroupModel from "models/product_group.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("API /api/v1/product-groups/admin/[id]", () => {
  let adminSession, consumerSession, unauthorizedSession, expiredSession;
  let targetGroup;

  beforeAll(async () => {
    // 1. Setup do ambiente
    const adminUser = await user.findOneUser({ username: "mainUser" });
    const updatedAdmin = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    await user.addFeatures(updatedAdmin, ["shop:products:manage"]);
    adminSession = await session.create(updatedAdmin);

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

    let unauthorizedUser = await user.create({
      username: "noPerms",
      email: "no@test.com",
      password: "StrongPassword123@",
    });
    unauthorizedUser = await user.update({
      id: unauthorizedUser.id,
      password: "StrongPassword123@",
    });
    await user.removeFeatures(unauthorizedUser, unauthorizedUser.features);
    unauthorizedSession = await session.create(unauthorizedUser);

    const expiredUser = await user.create({
      username: "expired",
      email: "expired@test.com",
      password: "StrongPassword123@",
    });
    await user.addFeatures(expiredUser, ["shop:products:manage"]);
    await user.expireUserPassword(expiredUser);
    expiredSession = await session.create(expiredUser);

    // 2. Criar Grupo Alvo
    targetGroup = await productGroupModel.create({
      name: "Grupo Para Edição",
      slug: "grupo-para-edicao",
      description: "Descrição original",
      is_active: true,
    });
  });

  describe("Security Check (All Methods)", () => {
    test("Anonymous user should get 403 Forbidden", async () => {
      const getRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}`,
      );
      expect(getRes.status).toBe(403);
    });

    test("Consumer user (without manage feature) should get 403 Forbidden", async () => {
      const putRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${consumerSession.token}`,
          },
          body: JSON.stringify({ name: "Tentativa Hacker" }),
        },
      );
      expect(putRes.status).toBe(403);
    });

    test("User with expired password should get 403 PasswordExpiredError", async () => {
      const getRes = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}`,
        { headers: { cookie: `session_id=${expiredSession.token}` } },
      );

      expect(getRes.status).toBe(403);
      const body = await getRes.json();
      expect(body.name).toBe("PasswordExpiredError");
    });
  });

  describe("GET Method", () => {
    test("Admin should be able to get group by ID", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}`,
        { headers: { cookie: `session_id=${adminSession.token}` } },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(targetGroup.id);
      expect(body.name).toBe("Grupo Para Edição");
      // Verifica se a propriedade items vem aninhada (mesmo que vazia por agora)
      expect(body.items).toBeDefined();
    });

    test("Should return 404 for a non-existent UUID", async () => {
      const fakeUUID = orchestrator.generateRandomUUIDV4();
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${fakeUUID}`,
        { headers: { cookie: `session_id=${adminSession.token}` } },
      );
      expect(response.status).toBe(404);
    });
  });

  describe("PUT Method", () => {
    test("Admin should be able to update group data", async () => {
      const updateData = {
        name: "Grupo Editado com Sucesso",
        is_active: false,
      };

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify(updateData),
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(targetGroup.id);
      expect(body.name).toBe("Grupo Editado com Sucesso");
      expect(body.is_active).toBe(false);
      // O slug não foi enviado, deve manter o original
      expect(body.slug).toBe("grupo-para-edicao");
    });

    test("Should ignore unknown fields when updating a group", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ foo: "bar" }),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
      expect(body.message).toBe("Objeto enviado deve ter no mínimo uma chave.");
    });

    test("Should return 400 when body is empty", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );
      const body = await response.json();
      expect(response.status).toBe(400);

      expect(body.name).toBe("ValidationError");
      expect(body.message).toBe("Objeto enviado deve ter no mínimo uma chave.");
    });
  });

  describe("DELETE Method", () => {
    test("Admin should be able to delete a group", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(targetGroup.id);

      // Verifica se foi mesmo apagado
      const checkResponse = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}`,
        { headers: { cookie: `session_id=${adminSession.token}` } },
      );
      expect(checkResponse.status).toBe(404);
    });
  });
});
