import coupon from "models/coupon.js";
import { ValidationError, NotFoundError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import database from "infra/database";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: Coupon", () => {
  let user1, userId;

  beforeAll(async () => {
    user1 = await user.create({
      username: "cart",
      email: "cart@test.com",
      password: "StrongPassword123@",
    });
    userId = user1.id;
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
});
