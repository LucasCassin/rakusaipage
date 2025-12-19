import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import product from "models/product.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PUT /api/v1/products/admin/[id]", () => {
  let adminUser, adminToken, testProduct;

  beforeAll(async () => {
    // 1. Cria usuário Admin
    adminUser = await user.findOneUser({ username: "mainUser" });

    // Atualiza a senha para garantir que não esteja expirada (user.create define data antiga)
    await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    // 2. Dá permissão de gerenciar produtos
    adminUser = await user.addFeatures(adminUser, ["shop:products:manage"]);

    // 3. Cria sessão
    const sessionObj = await session.create(adminUser);
    adminToken = sessionObj.token;

    // 4. Cria um produto base para testes
    testProduct = await product.create({
      name: "Produto Original",
      slug: "produto-original",
      description: "Descrição Original",
      category: "testes",
      price_in_cents: 5000,
      minimum_price_in_cents: 0,
      stock_quantity: 10,
      weight_in_grams: 200,
      length_cm: 20,
      height_cm: 20,
      width_cm: 20,
      images: [],
    });
  });

  test("should update product details successfully when user is admin", async () => {
    const formData = new FormData();
    formData.append("name", "Produto Atualizado");
    formData.append("price_in_cents", "6000");
    formData.append("is_active", "false");
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/products/admin/${testProduct.id}`,
      {
        method: "PUT",
        body: formData,
        headers: {
          cookie: `session_id=${adminToken}`,
        },
      },
    );

    const responseBody = await response.json();
    expect(response.status).toBe(200);
    expect(responseBody.name).toBe("Produto Atualizado");
    expect(responseBody.price_in_cents).toBe(6000);
    expect(responseBody.is_active).toBe(false);

    // Verifica persistência no banco
    const dbProduct = await product.findById(testProduct.id);
    expect(dbProduct.name).toBe("Produto Atualizado");
  });

  test("should return 403 Forbidden if user does not have permission", async () => {
    // Cria usuário comum sem features
    const commonUser = await user.create({
      username: "commonUser",
      email: "common@test.com",
      password: "StrongPassword123@",
    });
    // Atualiza a senha para garantir que não esteja expirada
    await user.update({
      id: commonUser.id,
      password: "StrongPassword123@",
    });
    const commonSession = await session.create(commonUser);

    const form = new FormData();
    form.append("name", "Tentativa Hacker");

    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/products/admin/${testProduct.id}`,
      {
        method: "PUT",
        headers: {
          cookie: `session_id=${commonSession.token}`,
        },
        body: form,
      },
    );

    expect(response.status).toBe(403);
  });

  test("should return 404 Not Found if product id does not exist", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const form = new FormData();
    form.append("name", "Fantasma");

    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/products/admin/${fakeId}`,
      {
        method: "PUT",
        headers: {
          cookie: `session_id=${adminToken}`,
        },
        body: form,
      },
    );

    expect(response.status).toBe(404);
  });
});
