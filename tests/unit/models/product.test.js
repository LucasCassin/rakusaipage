import product from "models/product.js";
import { ValidationError, NotFoundError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: Product", () => {
  // Helper para criar produto rápido nos testes
  const createBaseProduct = async (suffix = "1", overrides = {}) => {
    return await product.create({
      name: `Produto Teste ${suffix}`,
      slug: `produto-teste-${suffix}`,
      description: "Descrição teste",
      category: "Vestuário",
      price_in_cents: 1000,
      minimum_price_in_cents: 800,
      stock_quantity: 10,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      images: [{ url: "http://test.com/img.jpg", alt: "alt" }],
      is_active: true,
      ...overrides,
    });
  };

  describe("create", () => {
    test("should create a valid product with all optional fields", async () => {
      const productData = {
        name: "Camiseta Rakusai Completa",
        slug: "camiseta-completa-2025",
        description: "Descrição detalhada",
        category: "Vestuário",
        tags: ["verão", "algodão"],
        price_in_cents: 5000,
        minimum_price_in_cents: 4000,
        stock_quantity: 100,
        weight_in_grams: 200,
        length_cm: 30,
        height_cm: 20,
        width_cm: 5,
        images: [
          { url: "https://rk.com/img1.jpg", alt: "Frente", is_cover: true },
        ],
        is_active: true,
      };

      const created = await product.create(productData);

      expect(created.id).toBeDefined();
      expect(created.name).toBe(productData.name);
      expect(created.slug).toBe(productData.slug);
      expect(created.tags).toEqual(productData.tags);
      expect(created.images[0].url).toBe(productData.images[0].url);
      expect(created.is_active).toBe(true);
    });

    test("should create a digital product correctly", async () => {
      const productData = {
        name: "E-book de Taiko",
        slug: "ebook-taiko-2025",
        description: "Livro digital",
        category: "Digital",
        price_in_cents: 2500,
        minimum_price_in_cents: 2000,
        stock_quantity: 9999, // Estoque "infinito"
        weight_in_grams: 0, // Sem peso
        length_cm: 1, // Dimensões mínimas
        height_cm: 1,
        width_cm: 1,
        is_digital: true,
      };

      const created = await product.create(productData);
      expect(created.id).toBeDefined();
      expect(created.is_digital).toBe(true);
      expect(created.weight_in_grams).toBe(0);
    });

    test("should throw ValidationError when creating product with duplicate slug", async () => {
      await createBaseProduct("duplicate");

      // Tenta criar outro com o mesmo slug "produto-teste-duplicate"
      const duplicatePromise = createBaseProduct("duplicate");

      await expect(duplicatePromise).rejects.toThrow(ValidationError);
      await expect(duplicatePromise).rejects.toThrow(
        "Já existe um produto com este slug",
      );
    });

    test("should throw ValidationError when required fields are missing", async () => {
      // Tenta criar sem 'price_in_cents' e sem 'slug'
      const invalidProduct = {
        name: "Produto Inválido",
      };

      await expect(product.create(invalidProduct)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("findById", () => {
    test("should return the product when given a valid ID", async () => {
      const original = await createBaseProduct("find-id");
      const found = await product.findById(original.id);

      expect(found).toEqual(original);
    });

    test("should throw NotFoundError when ID does not exist", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(product.findById(fakeUUID)).rejects.toThrow(NotFoundError);
    });
  });

  describe("findBySlug", () => {
    test("should return the product when given a valid slug", async () => {
      const original = await createBaseProduct("find-slug");
      const found = await product.findBySlug(original.slug);

      expect(found.id).toBe(original.id);
    });

    test("should throw NotFoundError when slug does not exist", async () => {
      await expect(product.findBySlug("slug-inexistente")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("findAll", () => {
    test("should list products with pagination", async () => {
      // Limpa banco ou garante isolamento (o createBaseProduct cria novos registros)
      // Vamos criar 3 produtos específicos para este teste para garantir a contagem
      await createBaseProduct("list-1");
      await createBaseProduct("list-2");
      await createBaseProduct("list-3");

      const result = await product.findAll({ limit: 2 });

      expect(result.products.length).toBe(2);
      expect(result.count).toBeGreaterThanOrEqual(3);
    });

    test("should filter products by category", async () => {
      await createBaseProduct("cat-a", { category: "Acessórios" });
      await createBaseProduct("cat-b", { category: "Instrumentos" });

      const resultA = await product.findAll({ category: "Acessórios" });
      const resultB = await product.findAll({ category: "Instrumentos" });

      expect(resultA.products[0].category).toBe("Acessórios");
      expect(resultB.products[0].category).toBe("Instrumentos");
    });

    test("should filter products by allowed features", async () => {
      await createBaseProduct("cat-fa", {
        allowed_features: ["feature-a"],
        category: "TesteFeatures",
      });
      await createBaseProduct("cat-fb", {
        allowed_features: ["feature-b"],
        category: "TesteFeatures",
      });
      const result = await product.findAll({
        category: "TesteFeatures",
        userFeatures: ["feature-a"],
      });
      expect(result.count).toBe(1);
    });

    test("should filter products by is_active status", async () => {
      await createBaseProduct("active", { is_active: true });
      await createBaseProduct("inactive", { is_active: false });

      const activeOnly = await product.findAll({
        isActive: true,
        userFeatures: ["shop:products:manage"],
      });
      const inactiveOnly = await product.findAll({
        isActive: false,
        userFeatures: ["shop:products:manage"],
      });

      // Verifica se no array de ativos todos são true
      const allActive = activeOnly.products.every((p) => p.is_active === true);
      expect(allActive).toBe(true);

      // Verifica se trouxe o inativo
      const hasInactive = inactiveOnly.products.some(
        (p) => p.slug === "produto-teste-inactive",
      );
      expect(hasInactive).toBe(true);
    });
  });

  describe("update", () => {
    test("should update basic fields successfully", async () => {
      const original = await createBaseProduct("update-basic");

      const updated = await product.update(original.id, {
        name: "Nome Atualizado",
        price_in_cents: 9999,
      });

      expect(updated.name).toBe("Nome Atualizado");
      expect(updated.price_in_cents).toBe(9999);
      expect(updated.description).toBe(original.description); // Não mudou
      expect(updated.slug).toBe(original.slug); // Não mudou
    });

    test("should update is_active status (disable product)", async () => {
      const original = await createBaseProduct("to-disable", {
        is_active: true,
      });

      const updated = await product.update(original.id, {
        is_active: false,
      });

      expect(updated.is_active).toBe(false);
    });

    test("should update is_digital status", async () => {
      const original = await createBaseProduct("to-digital", {
        is_digital: false,
      });
      expect(original.is_digital).toBe(false);

      const updated = await product.update(original.id, {
        is_digital: true,
      });

      expect(updated.is_digital).toBe(true);
    });

    test("should update JSON fields (images array) successfully", async () => {
      const original = await createBaseProduct("json-update");

      const newImages = [
        { url: "http://new.com/1.jpg", alt: "1", is_cover: true },
        { url: "http://new.com/2.jpg", alt: "2", is_cover: false },
      ];

      const updated = await product.update(original.id, {
        images: newImages,
      });

      expect(updated.images).toHaveLength(2);
      expect(updated.images[0].url).toBe("http://new.com/1.jpg");
    });

    test("should throw NotFoundError if updating non-existent ID", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(product.update(fakeUUID, { name: "Ghost" })).rejects.toThrow(
        NotFoundError,
      );
    });

    test("should throw ValidationError if update data is empty", async () => {
      const original = await createBaseProduct("empty-update");
      await expect(product.update(original.id, {})).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("Product Model Validation Pickup Delivery", () => {
    const baseProduct = {
      name: "Produto Teste",
      slug: "prod-teste",
      description: "Desc",
      category: "Test",
      price_in_cents: 1000,
      minimum_price_in_cents: 100,
      stock_quantity: 10,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      images: [],
    };

    test("should fail if allow_pickup is true but address/instructions are missing", async () => {
      const invalidData = {
        ...baseProduct,
        allow_pickup: true,
        // pickup_address FALTANDO
      };

      const promise = product.create(invalidData);
      await expect(promise).rejects.toThrow(ValidationError);
    });

    test("should succeed if allow_pickup is true and details provided", async () => {
      const validData = {
        ...baseProduct,
        slug: "prod-pickup-ok",
        allow_pickup: true,
        pickup_address: "Rua Teste, 123",
        pickup_instructions: "Horário comercial",
      };

      const created = await product.create(validData);
      expect(created.id).toBeDefined();
      expect(created.allow_pickup).toBe(true);
      expect(created.pickup_address).toBe("Rua Teste, 123");
    });

    test("should succeed if allow_pickup is false and details missing", async () => {
      const validData = {
        ...baseProduct,
        slug: "prod-no-pickup",
        allow_pickup: false,
      };

      const created = await product.create(validData);
      expect(created.id).toBeDefined();
      expect(created.allow_pickup).toBe(false);
      expect(created.pickup_address).toBeNull();
    });
  });
});
