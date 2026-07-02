import pdvProduct from "models/pdv_product.js";
import { ValidationError, NotFoundError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: PdvProduct", () => {
  const createBaseProduct = async (suffix = "1", overrides = {}) => {
    return await pdvProduct.create({
      name: `Produto PDV ${suffix}`,
      price_in_cents: 1000,
      stock_quantity: 10,
      ...overrides,
    });
  };

  describe("create", () => {
    test("should create a product with only required fields", async () => {
      const created = await pdvProduct.create({
        name: "Bolo de Chocolate",
        price_in_cents: 1500,
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe("Bolo de Chocolate");
      expect(created.price_in_cents).toBe(1500);
      expect(created.stock_quantity).toBe(0);
      expect(created.min_unit_price_in_cents).toBe(0);
      expect(created.allow_negative_stock).toBe(false);
      expect(created.is_active).toBe(true);
    });

    test("should create a product with all optional fields", async () => {
      const created = await pdvProduct.create({
        name: "Água com Gás",
        price_in_cents: 500,
        stock_quantity: 50,
        min_unit_price_in_cents: 300,
        default_discount_type: "percentage",
        default_discount_value: 10,
        allow_negative_stock: true,
        max_negative_stock: 5,
      });

      expect(created.stock_quantity).toBe(50);
      expect(created.min_unit_price_in_cents).toBe(300);
      expect(created.default_discount_type).toBe("percentage");
      expect(created.default_discount_value).toBe(10);
      expect(created.allow_negative_stock).toBe(true);
      expect(created.max_negative_stock).toBe(5);
    });

    test("should throw ValidationError when required fields are missing", async () => {
      await expect(pdvProduct.create({ name: "Sem preço" })).rejects.toThrow(
        ValidationError,
      );
    });

    test("should throw ValidationError for negative price", async () => {
      await expect(
        pdvProduct.create({ name: "Preço negativo", price_in_cents: -100 }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("findById", () => {
    test("should return the product when given a valid ID", async () => {
      const original = await createBaseProduct("find-id");
      const found = await pdvProduct.findById(original.id);
      expect(found).toEqual(original);
    });

    test("should throw NotFoundError when ID does not exist", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(pdvProduct.findById(fakeUUID)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("findAll", () => {
    test("should list products with pagination", async () => {
      await createBaseProduct("list-1");
      await createBaseProduct("list-2");
      await createBaseProduct("list-3");

      const result = await pdvProduct.findAll({ limit: 2 });

      expect(result.products.length).toBe(2);
      expect(result.count).toBeGreaterThanOrEqual(3);
    });

    test("should filter by search term", async () => {
      await createBaseProduct("busca-unica-xyz");
      const result = await pdvProduct.findAll({ search: "busca-unica-xyz" });
      expect(result.products.length).toBe(1);
    });

    test("should filter by is_active status", async () => {
      await createBaseProduct("active", { is_active: true });
      const inactive = await createBaseProduct("inactive", {
        is_active: false,
      });
      await pdvProduct.remove(inactive.id);

      const activeOnly = await pdvProduct.findAll({ isActive: true });
      const inactiveOnly = await pdvProduct.findAll({ isActive: false });

      expect(activeOnly.products.every((p) => p.is_active === true)).toBe(true);
      expect(inactiveOnly.products.some((p) => p.id === inactive.id)).toBe(
        true,
      );
    });
  });

  describe("update", () => {
    test("should update basic fields successfully", async () => {
      const original = await createBaseProduct("update-basic");

      const updated = await pdvProduct.update(original.id, {
        name: "Nome Atualizado",
        price_in_cents: 2000,
      });

      expect(updated.name).toBe("Nome Atualizado");
      expect(updated.price_in_cents).toBe(2000);
    });

    test("should reject stock_quantity in the payload", async () => {
      const original = await createBaseProduct("update-stock-reject");

      await expect(
        pdvProduct.update(original.id, { stock_quantity: 999 }),
      ).rejects.toThrow(ValidationError);
    });

    test("should throw NotFoundError if updating non-existent ID", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(
        pdvProduct.update(fakeUUID, { name: "Ghost" }),
      ).rejects.toThrow(NotFoundError);
    });

    test("should throw ValidationError if update data is empty", async () => {
      const original = await createBaseProduct("empty-update");
      await expect(pdvProduct.update(original.id, {})).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("remove", () => {
    test("should soft-delete the product, preserving the row", async () => {
      const original = await createBaseProduct("to-remove");
      const removed = await pdvProduct.remove(original.id);

      expect(removed.is_active).toBe(false);

      const stillThere = await pdvProduct.findById(original.id);
      expect(stillThere.id).toBe(original.id);
    });

    test("should be reactivatable via update", async () => {
      const original = await createBaseProduct("to-reactivate");
      await pdvProduct.remove(original.id);

      const reactivated = await pdvProduct.update(original.id, {
        is_active: true,
      });
      expect(reactivated.is_active).toBe(true);
    });
  });

  describe("hardDelete", () => {
    test("should permanently delete a product with no sale history", async () => {
      const original = await createBaseProduct("to-hard-delete");
      await pdvProduct.hardDelete(original.id);

      await expect(pdvProduct.findById(original.id)).rejects.toThrow(
        NotFoundError,
      );
    });

    test("should throw NotFoundError when deleting a non-existent product", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(pdvProduct.hardDelete(fakeUUID)).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("adjustStock", () => {
    test("should increment stock", async () => {
      const original = await createBaseProduct("adjust-inc", {
        stock_quantity: 10,
      });
      const updated = await pdvProduct.adjustStock(original.id, 5);
      expect(updated.stock_quantity).toBe(15);
    });

    test("should decrement stock within the available limit", async () => {
      const original = await createBaseProduct("adjust-dec", {
        stock_quantity: 10,
      });
      const updated = await pdvProduct.adjustStock(original.id, -4);
      expect(updated.stock_quantity).toBe(6);
    });

    test("should decrement stock down to exactly zero", async () => {
      const original = await createBaseProduct("adjust-zero", {
        stock_quantity: 5,
      });
      const updated = await pdvProduct.adjustStock(original.id, -5);
      expect(updated.stock_quantity).toBe(0);
    });

    test("should fail to decrement below zero without allow_negative_stock", async () => {
      const original = await createBaseProduct("adjust-fail", {
        stock_quantity: 3,
        allow_negative_stock: false,
      });

      await expect(
        pdvProduct.adjustStock(original.id, -4),
      ).rejects.toMatchObject({ statusCode: 409 });

      const unchanged = await pdvProduct.findById(original.id);
      expect(unchanged.stock_quantity).toBe(3);
    });

    test("should allow going negative up to max_negative_stock", async () => {
      const original = await createBaseProduct("adjust-neg-ok", {
        stock_quantity: 2,
        allow_negative_stock: true,
        max_negative_stock: 3,
      });

      const updated = await pdvProduct.adjustStock(original.id, -5);
      expect(updated.stock_quantity).toBe(-3);
    });

    test("should fail to exceed max_negative_stock", async () => {
      const original = await createBaseProduct("adjust-neg-fail", {
        stock_quantity: 2,
        allow_negative_stock: true,
        max_negative_stock: 3,
      });

      await expect(
        pdvProduct.adjustStock(original.id, -6),
      ).rejects.toMatchObject({ statusCode: 409 });

      const unchanged = await pdvProduct.findById(original.id);
      expect(unchanged.stock_quantity).toBe(2);
    });

    test("should throw NotFoundError for a non-existent product", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(pdvProduct.adjustStock(fakeUUID, -1)).rejects.toThrow(
        NotFoundError,
      );
    });

    test("concurrent decrements never push stock below zero", async () => {
      const original = await createBaseProduct("adjust-concurrency", {
        stock_quantity: 5,
        allow_negative_stock: false,
      });

      const attempts = Array.from({ length: 10 }, () =>
        pdvProduct.adjustStock(original.id, -1).catch((error) => error),
      );
      const results = await Promise.all(attempts);

      const successes = results.filter((result) => !(result instanceof Error));
      const failures = results.filter((result) => result instanceof Error);

      expect(successes.length).toBe(5);
      expect(failures.length).toBe(5);
      failures.forEach((failure) => {
        expect(failure.statusCode).toBe(409);
      });

      const final = await pdvProduct.findById(original.id);
      expect(final.stock_quantity).toBe(0);
    });
  });

  describe("decrementForSale / restockForCancel", () => {
    test("should decrement multiple items and restock them symmetrically", async () => {
      const productA = await createBaseProduct("sale-a", {
        stock_quantity: 10,
      });
      const productB = await createBaseProduct("sale-b", {
        stock_quantity: 10,
      });

      const items = [
        { product_id: productA.id, quantity: 3 },
        { product_id: productB.id, quantity: 2 },
      ];

      await pdvProduct.decrementForSale(items);

      const afterSaleA = await pdvProduct.findById(productA.id);
      const afterSaleB = await pdvProduct.findById(productB.id);
      expect(afterSaleA.stock_quantity).toBe(7);
      expect(afterSaleB.stock_quantity).toBe(8);

      await pdvProduct.restockForCancel(items);

      const afterCancelA = await pdvProduct.findById(productA.id);
      const afterCancelB = await pdvProduct.findById(productB.id);
      expect(afterCancelA.stock_quantity).toBe(10);
      expect(afterCancelB.stock_quantity).toBe(10);
    });
  });
});
