import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import productGroupModel from "models/product_group.js";
import productModel from "models/product.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("API /api/v1/product-groups/admin/[id]/items", () => {
  let adminSession, consumerSession, unauthorizedSession, expiredSession;
  let targetGroup, physicalProduct;

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

    // 2. Criar Grupo e Produto
    targetGroup = await productGroupModel.create({
      name: "Coleção Teste Pivô",
      slug: "colecao-teste-pivo",
      is_active: true,
    });

    physicalProduct = await productModel.create({
      name: "Produto Físico Base",
      slug: "produto-fisico-base",
      description: "Teste",
      category: "Teste",
      price_in_cents: 1000,
      minimum_price_in_cents: 500,
      stock_quantity: 10,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
    });
  });

  describe("Security Check", () => {
    test("Anonymous user should get 403 Forbidden on POST", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            product_id: physicalProduct.id,
            variations: {},
          }),
        },
      );
      expect(response.status).toBe(403);
    });

    test("Consumer user should get 403 Forbidden on POST", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${consumerSession.token}`,
          },
          body: JSON.stringify({
            product_id: physicalProduct.id,
            variations: {},
          }),
        },
      );
      expect(response.status).toBe(403);
    });

    test("Expired password user should get 403 PasswordExpiredError", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${expiredSession.token}`,
          },
          body: JSON.stringify({
            product_id: physicalProduct.id,
            variations: {},
          }),
        },
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.name).toBe("PasswordExpiredError");
    });
  });

  describe("POST Method (Add Item)", () => {
    test("Admin should be able to add a product to the group with variations", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({
            product_id: physicalProduct.id,
            variations: { Tamanho: "M", Cor: "Preto" },
          }),
        },
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.product_group_id).toBe(targetGroup.id);
      expect(body.product_id).toBe(physicalProduct.id);
      expect(body.variations).toEqual({ Tamanho: "M", Cor: "Preto" });
    });

    test("Should return 400 when trying to add the exact same product again", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({
            product_id: physicalProduct.id, // O mesmo ID
            variations: { Tamanho: "G" },
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
      expect(body.message).toBe("Este produto já está adicionado neste grupo.");
    });

    test("Should return 400 when required fields are missing", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
    });
  });

  describe("PUT Method (Update Variations)", () => {
    test("Admin should be able to update variations of an existing item", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items/${physicalProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({
            variations: { Tamanho: "M", Cor: "Branco", Extra: "Estampa" },
          }),
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.variations.Cor).toBe("Branco");
      expect(body.variations.Extra).toBe("Estampa");
    });

    test("Should return 400 when required fields are missing", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items/${physicalProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
    });

    test("Should return 404 when updating a non-existent item", async () => {
      const nonExistentProductId = orchestrator.generateRandomUUIDV4();
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items/${nonExistentProductId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ variations: { Teste: "X" } }),
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE Method (Remove Item)", () => {
    test("Admin should be able to remove an item from the group", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items/${physicalProduct.id}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );

      const body = await response.json();
      expect(response.status).toBe(200);

      // Valida se foi mesmo removido tentando atualizar e esperando um 404
      const checkResponse = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items/${physicalProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${adminSession.token}`,
          },
          body: JSON.stringify({ variations: {} }),
        },
      );
      expect(checkResponse.status).toBe(404);
    });

    test("Should return 404 when removing a non-existent item", async () => {
      const nonExistentProductId = orchestrator.generateRandomUUIDV4();
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/product-groups/admin/${targetGroup.id}/items/${nonExistentProductId}`,
        {
          method: "DELETE",
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );

      expect(response.status).toBe(404);
    });
  });
});
