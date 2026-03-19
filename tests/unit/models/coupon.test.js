import coupon from "models/coupon.js";
import { ValidationError, NotFoundError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import database from "infra/database";
import product from "models/product.js";
import cart from "models/cart.js";
import order from "models/order.js";
import { allow } from "joi";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: Coupon", () => {
  let user1, userId, testProduct;

  beforeAll(async () => {
    user1 = await user.create({
      username: "cart",
      email: "cart@test.com",
      password: "StrongPassword123@",
    });
    userId = user1.id;

    testProduct = await product.create({
      name: "Produto Cupom",
      slug: "prod-cupom",
      price_in_cents: 1000,
      stock_quantity: 100,
      description: "...",
      category: "test",
      minimum_price_in_cents: 100,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      images: [],
      allow_pickup: true,
      allow_delivery: true,
      pickup_address: "Rua Teste ABC",
      pickup_instructions: "Instrucoes de retirada",
    });
  });

  describe("create", () => {
    test("should create a valid standard coupon (subtotal type by default)", async () => {
      const created = await coupon.create({
        code: "TESTE10",
        description: "10% Off",
        discount_percentage: 10,
      });

      expect(created.id).toBeDefined();
      expect(created.code).toBe("TESTE10");
      expect(created.is_active).toBe(true);
      expect(created.type).toBe("subtotal"); // Default
      expect(created.max_discount_in_cents).toBeNull();
    });

    test("should create a SHIPPING coupon with MAX LIMIT", async () => {
      const created = await coupon.create({
        code: "FRETE50LIMITADO",
        description: "100% Off no Frete até 50 reais",
        discount_percentage: 100,
        type: "shipping", // Tipo Frete
        max_discount_in_cents: 5000, // Limite R$ 50,00
      });

      expect(created.code).toBe("FRETE50LIMITADO");
      expect(created.type).toBe("shipping");
      expect(created.max_discount_in_cents).toBe(5000);
    });

    test("should not create duplicate code", async () => {
      await expect(
        coupon.create({
          code: "TESTE10", // Mesmo do primeiro teste
          description: "Duplicado",
          discount_percentage: 5,
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("validate", () => {
    test("should validate a correct coupon", async () => {
      const valid = await coupon.validate("TESTE10", userId, 1000);
      expect(valid.code).toBe("TESTE10");
    });

    test("should throw error for non-existent coupon", async () => {
      await expect(coupon.validate("NAOEXISTE", userId, 1000)).rejects.toThrow(
        NotFoundError,
      );
    });

    test("should throw error for minimum value not met (applies to shipping coupons too)", async () => {
      await coupon.create({
        code: "FRETEMINIMO",
        description: "Frete Gratis acima de 100",
        discount_percentage: 100,
        type: "shipping",
        min_purchase_value_in_cents: 10000, // R$ 100,00
      });

      // Tenta passar com R$ 50,00 de produto
      await expect(
        coupon.validate("FRETEMINIMO", userId, 5000),
      ).rejects.toThrow("valor mínimo");
    });

    test("should throw error for expired coupon", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await coupon.create({
        code: "VELHO",
        description: "Expirado",
        discount_percentage: 10,
        expiration_date: yesterday.toISOString(),
      });

      await expect(coupon.validate("VELHO", userId, 1000)).rejects.toThrow(
        "expirou",
      );
    });

    test("should throw error for usage limit per user", async () => {
      // 1. Cria cupom com limite de 1 uso por usuário
      const limitCoupon = await coupon.create({
        code: "UNICO",
        description: "Só uma vez",
        discount_percentage: 50,
        usage_limit_per_user: 1,
      });

      // 2. Simula que o usuário JÁ USOU este cupom
      await database.query({
        text: `
          INSERT INTO orders (
            user_id, subtotal_in_cents, total_in_cents, status, shipping_address_snapshot, applied_coupons
          ) VALUES ($1, 1000, 500, 'paid', '{}', $2)
        `,
        values: [userId, JSON.stringify([{ id: limitCoupon.id }])],
      });

      // 3. Tenta usar de novo
      await expect(coupon.validate("UNICO", userId, 2000)).rejects.toThrow(
        "atingiu o limite de uso",
      );
    });
  });

  test("should skip per-user limit check if userId is 'guest_simulation'", async () => {
    // 1. Cria cupom limitado a 1 uso por pessoa
    await coupon.create({
      code: "SIMULACAO",
      description: "Teste Simulação",
      discount_percentage: 10,
      usage_limit_per_user: 1,
    });

    // 2. Simulação não deve dar erro de UUID nem de limite (pois é guest_simulation)
    // Passamos valor suficiente (1000)
    const valid = await coupon.validate("SIMULACAO", "guest_simulation", 1000);
    expect(valid.code).toBe("SIMULACAO");
  });

  test("should still enforce GLOBAL limit even for guest_simulation", async () => {
    // 1. Cria cupom com limite GLOBAL esgotado
    const globalLimitCoupon = await coupon.create({
      code: "ESGOTADO",
      description: "Global Limit",
      discount_percentage: 10,
      usage_limit_global: 1, // Limite global 1
    });

    // 2. Simula que alguém já usou (insere pedido fake)
    await cart.clearCart(userId);
    await cart.addItem(userId, { product_id: testProduct.id, quantity: 1 });
    await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      shippingMethod: "PAC",
      couponCodes: ["ESGOTADO"],
    });
    // 3. Tenta simular. Deve falhar pois o cupom acabou para TODOS
    await expect(
      coupon.validate("ESGOTADO", "guest_simulation", 1000),
    ).rejects.toThrow("limite máximo");
  });

  describe("findAll", () => {
    beforeAll(async () => {
      // Garante que a tabela está limpa para este conjunto de testes
      await database.query("DELETE FROM coupons;");
      // Cria 25 cupons para testar a paginação
      for (let i = 1; i <= 25; i++) {
        await coupon.create({
          code: `PAGE${i}`,
          description: `Cupom de Paginação ${i}`,
          discount_percentage: 1,
        });
      }
    });

    test("should return the first page with default limit (20)", async () => {
      const result = await coupon.findAll();
      expect(result.coupons).toHaveLength(20);
      expect(result.count).toBe(25);
    });

    test("should return a specific page using limit and offset", async () => {
      const result = await coupon.findAll({ limit: 5, offset: 20 });
      expect(result.coupons).toHaveLength(5);
      expect(result.count).toBe(25);
      expect(result.coupons[0].code).toBe("PAGE5");
    });

    test("should return coupons ordered by creation date (newest first)", async () => {
      const result = await coupon.findAll({ limit: 5 });
      const firstCouponDate = new Date(result.coupons[0].created_at);
      const secondCouponDate = new Date(result.coupons[1].created_at);
      expect(firstCouponDate > secondCouponDate).toBe(true);
    });
  });

  describe("update", () => {
    let couponToUpdate;

    beforeEach(async () => {
      // Cria um cupom fresco antes de cada teste de update
      await database.query("DELETE FROM coupons;");
      couponToUpdate = await coupon.create({
        code: "EDITAVEL",
        description: "Descrição Original",
        discount_percentage: 15,
        type: "subtotal",
      });
    });

    test("should update a single field (e.g., description)", async () => {
      const updated = await coupon.update(couponToUpdate.id, {
        description: "Nova Descrição",
      });
      expect(updated.description).toBe("Nova Descrição");
      expect(updated.code).toBe("EDITAVEL"); // Não deve mudar
    });

    test("should update multiple fields (is_active and type)", async () => {
      const updated = await coupon.update(couponToUpdate.id, {
        is_active: false,
        type: "shipping",
      });
      expect(updated.is_active).toBe(false);
      expect(updated.type).toBe("shipping");
    });

    test("should throw ValidationError when trying to update code to a duplicate", async () => {
      // Cria um segundo cupom para ser o alvo do conflito
      await coupon.create({
        code: "EXISTENTE",
        description: "...",
        discount_percentage: 1,
      });

      const promise = coupon.update(couponToUpdate.id, { code: "EXISTENTE" });

      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toThrow(
        "Já existe um cupom com este código.",
      );
    });

    test("should throw NotFoundError for a non-existent coupon ID", async () => {
      const nonExistentId = "00000000-0000-4000-8000-000000000000";
      const promise = coupon.update(nonExistentId, { is_active: false });

      await expect(promise).rejects.toThrow(NotFoundError);
      await expect(promise).rejects.toThrow("Cupom não encontrado.");
    });

    test("should throw ValidationError if no valid data is provided for update", async () => {
      const promise = coupon.update(couponToUpdate.id, {});
      await expect(promise).rejects.toThrow(ValidationError);
      await expect(promise).rejects.toThrow(
        "Objeto enviado deve ter no mínimo uma chave.",
      );
    });

    test("should correctly handle the 'type' to 'coupon_type' mapping", async () => {
      const updated = await coupon.update(couponToUpdate.id, {
        type: "shipping",
      });
      expect(updated.type).toBe("shipping");
    });
  });
});
