import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import product from "models/product.js";
import { NotFoundError } from "errors/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/products/admin/[id]", () => {
  let adminUser, adminToken, productToDelete;

  beforeAll(async () => {
    // 1. Cria usuário Admin
    adminUser = await user.findOneUser({ username: "mainUser" });
    // Atualiza a senha para garantir que não esteja expirada
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });

    // 2. Dá permissão
    adminUser = await user.addFeatures(adminUser, ["shop:products:manage"]);

    // 3. Cria sessão
    const sessionObj = await session.create(adminUser);
    adminToken = sessionObj.token;
  });

  beforeEach(async () => {
    // Cria um produto novo antes de cada teste para garantir isolamento
    productToDelete = await product.create({
      name: "Produto Deletavel",
      slug: `del-${Date.now()}`,
      description: "Vai ser deletado",
      category: "lixo",
      price_in_cents: 100,
      minimum_price_in_cents: 0,
      stock_quantity: 1,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      images: [],
    });
  });

  test("should delete product successfully when user is admin", async () => {
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/products/admin/${productToDelete.id}`,
      {
        method: "DELETE",
        headers: {
          cookie: `session_id=${adminToken}`,
        },
      },
    );

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.id).toBe(productToDelete.id);

    // Verifica se sumiu do banco usando o model
    await expect(product.findById(productToDelete.id)).rejects.toThrow(
      NotFoundError,
    );
  });

  test("should return 403 Forbidden for unauthorized user", async () => {
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/products/admin/${productToDelete.id}`,
      {
        method: "DELETE",
        // Sem cookie
      },
    );
    expect(response.status).toBe(403);
  });

  test("should return 404 Not Found for non-existent product", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/products/admin/${fakeId}`,
      {
        method: "DELETE",
        headers: {
          cookie: `session_id=${adminToken}`,
        },
      },
    );
    expect(response.status).toBe(404);
  });
});
