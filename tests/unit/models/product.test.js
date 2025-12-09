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
  const createBaseProduct = async (suffix = "1") => {
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
        promotional_price_in_cents: 4500,
        minimum_price_in_cents: 4000,
        stock_quantity: 100,
        purchase_limit_per_user: 5,
        weight_in_grams: 200,
        length_cm: 30,
        height_cm: 5,
        width_cm: 20,
        production_days: 15,
        is_active: true,
        allowed_features: ["shop:consumer:view"],
        images: [
          {
            url: "http://exemplo.com/frente.jpg",
            alt: "Frente",
            is_cover: true,
          },
          {
            url: "http://exemplo.com/costas.jpg",
            alt: "Costas",
            is_cover: false,
          },
        ],
      };

      const newProduct = await product.create(productData);

      expect(newProduct.id).toBeDefined();
      expect(newProduct.name).toBe(productData.name);
      expect(newProduct.images).toHaveLength(2);
      expect(newProduct.tags).toEqual(["verão", "algodão"]);
      expect(newProduct.created_at).toBeDefined();
    });

    test("should throw ValidationError when slug is duplicated", async () => {
      await createBaseProduct("duplicate");
      // Tenta criar de novo com o mesmo slug "produto-teste-duplicate"
      await expect(createBaseProduct("duplicate")).rejects.toThrow(
        ValidationError,
      );
    });

    test("should throw ValidationError when price is invalid (float)", async () => {
      const invalidData = {
        ...(await createBaseProduct("float-check")), // Pega estrutura válida
        slug: "float-price-test",
        price_in_cents: 10.5, // Errado
      };
      // createBaseProduct já insere, então aqui simulamos o objeto puro
      const rawData = {
        name: "Erro",
        slug: "erro-float",
        description: "D",
        category: "C",
        price_in_cents: 10.5,
        minimum_price_in_cents: 0,
        stock_quantity: 1,
        weight_in_grams: 1,
        length_cm: 1,
        height_cm: 1,
        width_cm: 1,
      };

      await expect(product.create(rawData)).rejects.toThrow(ValidationError);
    });

    test("should throw ValidationError when required fields are missing", async () => {
      const incompleteData = {
        name: "Sem Preço",
        slug: "sem-preco",
        // Falta price, category, dimensions...
      };
      await expect(product.create(incompleteData)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("findById", () => {
    test("should return product when ID exists", async () => {
      const created = await createBaseProduct("find-id");
      const found = await product.findById(created.id);
      expect(found.id).toBe(created.id);
      expect(found.name).toBe(created.name);
    });

    test("should throw NotFoundError when ID does not exist", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(product.findById(fakeUUID)).rejects.toThrow(NotFoundError);
    });

    test("should throw ValidationError when ID is invalid uuid", async () => {
      await expect(product.findById("invalid-uuid-string")).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("findBySlug", () => {
    test("should return product when slug exists", async () => {
      const created = await createBaseProduct("find-slug");
      const found = await product.findBySlug("produto-teste-find-slug");
      expect(found.id).toBe(created.id);
    });

    test("should throw NotFoundError when slug does not exist", async () => {
      await expect(product.findBySlug("slug-inexistente-123")).rejects.toThrow(
        NotFoundError,
      );
    });

    test("should throw ValidationError when slug format is invalid", async () => {
      await expect(
        product.findBySlug("Slug Com Espaços e Maiusculas"),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("findAll", () => {
    beforeAll(async () => {
      // Popular banco para testes de lista
      await orchestrator.waitForAllServices();
      await orchestrator.clearDatabase();
      await orchestrator.runPendingMigrations();
      await product.create({
        name: "Camiseta Azul",
        slug: "camiseta-azul",
        description: ".",
        category: "Roupas",
        price_in_cents: 1000,
        minimum_price_in_cents: 0,
        stock_quantity: 10,
        weight_in_grams: 100,
        length_cm: 10,
        height_cm: 10,
        width_cm: 10,
        is_active: true,
      });
      await product.create({
        name: "Camiseta Verde",
        slug: "camiseta-verde",
        description: ".",
        category: "Roupas",
        price_in_cents: 1000,
        minimum_price_in_cents: 0,
        stock_quantity: 10,
        weight_in_grams: 100,
        length_cm: 10,
        height_cm: 10,
        width_cm: 10,
        is_active: false,
      });
      await product.create({
        name: "Bachi",
        slug: "bachi-madeira",
        description: ".",
        category: "Instrumentos",
        price_in_cents: 5000,
        minimum_price_in_cents: 0,
        stock_quantity: 5,
        weight_in_grams: 500,
        length_cm: 40,
        height_cm: 2,
        width_cm: 2,
        is_active: true,
      });
    });

    test("should return all products with count", async () => {
      const result = await product.findAll();
      expect(result.products).toHaveLength(3);
      expect(result.count).toBe(3);
    });

    test("should filter by category", async () => {
      const result = await product.findAll({ category: "Instrumentos" });
      expect(result.products).toHaveLength(1);
      expect(result.products[0].slug).toBe("bachi-madeira");
    });

    test("should filter by is_active status", async () => {
      const result = await product.findAll({ isActive: true });
      expect(result.products).toHaveLength(2); // Azul e Bachi
      const inactive = await product.findAll({ isActive: false });
      expect(inactive.products).toHaveLength(1); // Verde
    });

    test("should support pagination", async () => {
      const result = await product.findAll({ limit: 1, offset: 0 });
      expect(result.products).toHaveLength(1);
      // O count deve continuar mostrando o total disponível no banco, não na página
      expect(result.count).toBe(3);
    });
  });

  describe("update", () => {
    test("should update specific fields successfully", async () => {
      const original = await createBaseProduct("to-update");

      const updated = await product.update(original.id, {
        price_in_cents: 9999,
        name: "Nome Atualizado",
      });

      expect(updated.price_in_cents).toBe(9999);
      expect(updated.name).toBe("Nome Atualizado");
      expect(updated.description).toBe(original.description); // Não mudou
      expect(updated.slug).toBe(original.slug); // Não mudou
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

    test("should throw ValidationError if update violates constraints (negative price)", async () => {
      const original = await createBaseProduct("negative-update");
      await expect(
        product.update(original.id, { price_in_cents: -100 }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
