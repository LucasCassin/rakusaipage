import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import product from "models/product.js";

describe("Test POST /api/v1/products", () => {
  let adminUser, adminSession;
  let standardUser, standardSession;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Admin (com permissão de loja)
    adminUser = await user.findOneUser({ username: "mainUser" });
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    // Adiciona a feature específica da rota
    adminUser = await user.addFeatures(adminUser, ["shop:products:manage"]);
    adminSession = await session.create(adminUser);

    // 2. Criar Usuário Comum (sem permissão)
    standardUser = await user.create({
      username: "standardUser",
      email: "standard@test.com",
      password: "StrongPassword123@",
    });
    standardSession = await session.create(standardUser);
  });

  describe("Authorization & Security", () => {
    test("should return 403 if user is anonymous", async () => {
      const formData = new FormData();
      formData.append("name", "Anonymous Attempt");

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products`,
        {
          method: "POST",
          body: formData,
          // Não enviamos cookie
        },
      );

      expect(response.status).toBe(403);
    });

    test("should return 403 if user does not have 'shop:products:manage' feature", async () => {
      const formData = new FormData();
      formData.append("name", "Standard Attempt");

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products`,
        {
          method: "POST",
          body: formData,
          headers: {
            cookie: `session_id=${standardSession.token}`,
          },
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Product Creation (Happy Path)", () => {
    test("should create a valid product (Multipart Data)", async () => {
      // Setup: Dados do formulário
      const formData = new FormData();
      formData.append("name", "Camiseta Rakusai Teste");
      formData.append("slug", "camiseta-rakusai-teste");
      formData.append("description", "Uma descrição de teste");
      formData.append("category", "Vestuário");
      formData.append("price_in_cents", "5000"); // Envia como string, controller converte
      formData.append("minimum_price_in_cents", "4000");
      formData.append("stock_quantity", "10");
      formData.append("weight_in_grams", "200");
      formData.append("length_cm", "20");
      formData.append("height_cm", "10");
      formData.append("width_cm", "5");
      formData.append("is_active", "true");
      formData.append("tags", JSON.stringify(["teste", "integração"])); // JSON stringified

      // Execução
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products`,
        {
          method: "POST",
          body: formData, // fetch adiciona o Content-Type: multipart/form-data com boundary automaticamente
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      // Asserções de Resposta
      const responseBody = await response.json();
      expect(response.status).toBe(201);
      expect(responseBody.id).toBeDefined();
      expect(responseBody.name).toBe("Camiseta Rakusai Teste");
      expect(responseBody.slug).toBe("camiseta-rakusai-teste");
      expect(responseBody.price_in_cents).toBe(5000);
      expect(responseBody.tags).toEqual(["teste", "integração"]);

      // Asserções de Banco de Dados
      const dbProduct = await product.findById(responseBody.id);
      expect(dbProduct).toBeDefined();
      expect(dbProduct.minimum_price_in_cents).toBe(4000);
    });

    test("should return 400 validation error if required fields are missing", async () => {
      const formData = new FormData();
      formData.append("name", "Incomplete Product");
      // Faltando slug, price, etc.

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products`,
        {
          method: "POST",
          body: formData,
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );

      const responseBody = await response.json();
      expect(response.status).toBe(400);
      expect(responseBody.name).toBe("ValidationError");
    });

    test("should return 400 validation error if slug is duplicate", async () => {
      // 1. Cria o primeiro
      const formData1 = new FormData();
      formData1.append("name", "Produto A");
      formData1.append("slug", "slug-duplicado");
      formData1.append("description", "Desc");
      formData1.append("category", "Cat");
      formData1.append("price_in_cents", "1000");
      formData1.append("minimum_price_in_cents", "100");
      formData1.append("stock_quantity", "10");
      formData1.append("weight_in_grams", "10");
      formData1.append("length_cm", "10");
      formData1.append("height_cm", "10");
      formData1.append("width_cm", "10");

      await fetch(`${orchestrator.webserverUrl}/api/v1/products`, {
        method: "POST",
        body: formData1,
        headers: { cookie: `session_id=${adminSession.token}` },
      });

      // 2. Tenta criar o segundo com mesmo slug
      const formData2 = new FormData();
      // Copia os dados do form1
      for (const [key, value] of formData1.entries()) {
        formData2.append(key, value);
      }
      formData2.set("name", "Produto B"); // Nome diferente, mas slug igual

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/products`,
        {
          method: "POST",
          body: formData2,
          headers: { cookie: `session_id=${adminSession.token}` },
        },
      );

      const responseBody = await response.json();
      expect(response.status).toBe(400);
      expect(responseBody.message).toMatch(/slug/i);
    });
  });
});
