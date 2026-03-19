import productGroupModel from "models/product_group.js";
import productModel from "models/product.js";
import orchestrator from "tests/orchestrator.js";
import { NotFoundError, ValidationError } from "errors/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: Product Group", () => {
  let createdProduct1;
  let createdProduct2;
  let createdDigitalProduct;
  let createdGroup;

  // Precisamos de produtos reais para testar a tabela pivô (devido às Foreign Keys)
  beforeAll(async () => {
    createdProduct1 = await productModel.create({
      name: "Camiseta Base 1",
      slug: "camiseta-base-1",
      description: "Desc 1",
      category: "Roupas",
      price_in_cents: 5000,
      minimum_price_in_cents: 2000,
      stock_quantity: 10,
      weight_in_grams: 200,
      length_cm: 20,
      height_cm: 5,
      width_cm: 15,
      is_active: true,
    });

    createdProduct2 = await productModel.create({
      name: "Camiseta Base 2",
      slug: "camiseta-base-2",
      description: "Desc 2",
      category: "Roupas",
      price_in_cents: 6000,
      minimum_price_in_cents: 3000,
      stock_quantity: 5,
      weight_in_grams: 200,
      length_cm: 20,
      height_cm: 5,
      width_cm: 15,
      is_active: false, // Produto inativo para testar vitrine
    });

    createdDigitalProduct = await productModel.create({
      name: "E-book Aprenda Taiko",
      slug: "ebook-aprenda-taiko",
      description: "PDF completo",
      category: "Digital",
      price_in_cents: 2990,
      minimum_price_in_cents: 1000,
      stock_quantity: 9999,
      weight_in_grams: 1,
      length_cm: 1,
      height_cm: 1,
      width_cm: 1,
      is_active: true,
      is_digital: true,
      allow_delivery: false,
      allow_pickup: false,
    });
  });

  describe("create()", () => {
    test("Should create a new product group successfully", async () => {
      const groupData = {
        name: "Coleção de Inverno",
        slug: "colecao-inverno",
        description: "Roupas quentes",
        images: [{ url: "http://test.com/img.jpg", alt: "thumb" }],
        is_active: true,
      };
      createdGroup = await productGroupModel.create(groupData);

      expect(createdGroup.id).toBeDefined();
      expect(createdGroup.name).toBe("Coleção de Inverno");
      expect(createdGroup.slug).toBe("colecao-inverno");
      expect(createdGroup.images).toEqual([
        { url: "http://test.com/img.jpg", alt: "thumb", is_cover: false },
      ]);
      expect(createdGroup.is_active).toBe(true);
    });

    test("Should throw ValidationError if slug is duplicated", async () => {
      const groupData = {
        name: "Outro Nome",
        slug: "colecao-inverno", // Slug repetido
      };

      try {
        await productGroupModel.create(groupData);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe("Já existe um grupo com este slug (URL).");
      }
    });
  });

  describe("Tabela Pivô (N:N) - addItem, updateItemVariations, removeItem", () => {
    test("Should add a product to the group with variations", async () => {
      const result = await productGroupModel.addItem(
        createdGroup.id,
        createdProduct1.id,
        { Tamanho: "M", Cor: "Vermelho" },
      );

      expect(result.product_group_id).toBe(createdGroup.id);
      expect(result.product_id).toBe(createdProduct1.id);
      expect(result.variations).toEqual({ Tamanho: "M", Cor: "Vermelho" });
    });

    test("Should throw ValidationError when adding the exact same product to the same group twice", async () => {
      try {
        await productGroupModel.addItem(
          createdGroup.id,
          createdProduct1.id,
          { Tamanho: "G" }, // Tentando adicionar de novo
        );
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe(
          "Este produto já está adicionado neste grupo.",
        );
      }
    });

    test("Should add a second product to the same group", async () => {
      const result = await productGroupModel.addItem(
        createdGroup.id,
        createdProduct2.id,
        { Tamanho: "P", Cor: "Azul" },
      );
      expect(result.product_id).toBe(createdProduct2.id);
    });

    test("Should update variations of an existing item in the group", async () => {
      const result = await productGroupModel.updateItemVariations(
        createdGroup.id,
        createdProduct1.id,
        { Tamanho: "G", Cor: "Preto" }, // Nova variação
      );

      expect(result.variations).toEqual({ Tamanho: "G", Cor: "Preto" });
    });

    test("Should throw NotFoundError when updating a product not in the group", async () => {
      const fakeUUID = orchestrator.generateRandomUUIDV4();
      try {
        await productGroupModel.updateItemVariations(
          createdGroup.id,
          fakeUUID,
          {},
        );
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
      }
    });

    test("Should add a DIGITAL product to the group", async () => {
      // Cria um grupo específico para produtos digitais (ou poderia usar o mesmo grupo)
      const digitalGroup = await productGroupModel.create({
        name: "Materiais de Estudo",
        slug: "materiais-estudo",
        is_active: true,
      });

      // Adiciona o E-book ao grupo. Como não tem cor/tamanho, a variação pode ser apenas o formato
      const result = await productGroupModel.addItem(
        digitalGroup.id,
        createdDigitalProduct.id,
        { Formato: "PDF PDF/A" },
      );

      expect(result.product_id).toBe(createdDigitalProduct.id);
      expect(result.variations).toEqual({ Formato: "PDF PDF/A" });

      // Valida se a busca do grupo traz o produto e se ele é reconhecido como digital
      const fetchedGroup = await productGroupModel.findBySlug(
        digitalGroup.slug,
      );
      expect(fetchedGroup.items).toHaveLength(1);
      expect(fetchedGroup.items[0].is_digital).toBe(true);
    });
  });

  describe("findById() & findBySlug()", () => {
    test("findById: Should return group and ALL linked items (including inactive products)", async () => {
      const group = await productGroupModel.findById(createdGroup.id);

      expect(group.id).toBe(createdGroup.id);
      expect(group.items).toHaveLength(2); // Retorna os dois produtos atrelados

      // Verifica se o JSONB da pivô foi injetado corretamente no produto
      const item1 = group.items.find((i) => i.id === createdProduct1.id);
      expect(item1.group_variations).toEqual({ Tamanho: "G", Cor: "Preto" });
    });

    test("findBySlug: Should return group and ONLY ACTIVE linked items", async () => {
      const group = await productGroupModel.findBySlug(createdGroup.slug);

      expect(group.id).toBe(createdGroup.id);
      // Produto 2 foi criado como inativo, então a vitrine só deve retornar 1 item
      expect(group.items).toHaveLength(1);
      expect(group.items[0].id).toBe(createdProduct1.id);
    });

    test("Should throw NotFoundError for non-existent slug", async () => {
      try {
        await productGroupModel.findBySlug("nao-existe");
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
      }
    });
  });

  describe("findAll()", () => {
    test("Should list groups with total count", async () => {
      const result = await productGroupModel.findAll();
      expect(result.groups.length).toBeGreaterThan(0);
      expect(result.count).toBeGreaterThan(0);
      expect(result.groups[1].name).toBe("Coleção de Inverno");
    });

    test("Should filter by search term", async () => {
      const result = await productGroupModel.findAll({ search: "Inverno" });
      expect(result.groups).toHaveLength(1);
    });
  });

  describe("update()", () => {
    test("Should update group data successfully", async () => {
      const updated = await productGroupModel.update(createdGroup.id, {
        name: "Coleção de Verão",
        images: [{ url: "http://example.com/nova-url.jpg", alt: "nova thumb" }], // Atualizando as imagens
      });

      expect(updated.name).toBe("Coleção de Verão");
      expect(updated.images).toEqual([
        {
          url: "http://example.com/nova-url.jpg",
          alt: "nova thumb",
          is_cover: false,
        },
      ]);
      // O slug não foi enviado, deve permanecer o mesmo
      expect(updated.slug).toBe("colecao-inverno");
    });
  });

  describe("removeItem() & del()", () => {
    test("removeItem: Should remove a specific product from the group", async () => {
      await productGroupModel.removeItem(createdGroup.id, createdProduct1.id);

      const group = await productGroupModel.findById(createdGroup.id);
      // Antes tinha 2, agora tem 1
      expect(group.items).toHaveLength(1);
      expect(group.items[0].id).toBe(createdProduct2.id);
    });

    test("del: Should delete the group and cascade pivot table links", async () => {
      const deletedGroup = await productGroupModel.del(createdGroup.id);
      expect(deletedGroup.id).toBe(createdGroup.id);

      try {
        await productGroupModel.findById(createdGroup.id);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
      }

      // O produto físico DEVE continuar existindo (não foi apagado, só o grupo)
      const productStillExists = await productModel.findById(
        createdProduct2.id,
      );
      expect(productStillExists.id).toBe(createdProduct2.id);
    });
  });
});
