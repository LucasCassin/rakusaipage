import pdvSale from "models/pdv_sale.js";
import pdvProduct from "models/pdv_product.js";
import pdvPaymentMethod from "models/pdv_payment_method.js";
import pdvSettings from "models/pdv_settings.js";
import user from "models/user.js";
import { ValidationError, NotFoundError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";

let seller;
let paymentMethod;
let variant;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  seller = await user.create({
    username: "pdvSeller",
    email: "pdv-seller@test.com",
    password: "StrongPassword123@",
  });

  paymentMethod = await pdvPaymentMethod.create({ name: "Dinheiro" });
  const cardMethod = await pdvPaymentMethod.create({ name: "Cartão" });
  variant = await pdvPaymentMethod.createVariant(cardMethod.id, {
    name: "Máquina Amarela",
  });
});

describe("Model: PdvSale", () => {
  const createProduct = (suffix, overrides = {}) =>
    pdvProduct.create({
      name: `Produto Venda ${suffix}`,
      price_in_cents: 1000,
      stock_quantity: 20,
      ...overrides,
    });

  describe("create", () => {
    test("should create a sale without discount and decrement stock", async () => {
      const product = await createProduct("sem-desconto");

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 3 }],
        paymentMethodId: paymentMethod.id,
      });

      expect(sale.subtotal_in_cents).toBe(3000);
      expect(sale.discount_in_cents).toBe(0);
      expect(sale.total_in_cents).toBe(3000);
      expect(sale.items).toHaveLength(1);

      const updatedProduct = await pdvProduct.findById(product.id);
      expect(updatedProduct.stock_quantity).toBe(17);
    });

    test("should apply a percentage discount within cap/floor", async () => {
      const product = await createProduct("percentual");

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 10 }],
        discountType: "percentage",
        discountValue: 10,
        paymentMethodId: paymentMethod.id,
      });

      expect(sale.subtotal_in_cents).toBe(10000);
      expect(sale.discount_in_cents).toBe(1000);
      expect(sale.total_in_cents).toBe(9000);
    });

    test("should apply a fixed discount", async () => {
      const product = await createProduct("fixo");

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 10 }],
        discountType: "fixed",
        discountValue: 500,
        paymentMethodId: paymentMethod.id,
      });

      expect(sale.discount_in_cents).toBe(500);
      expect(sale.total_in_cents).toBe(9500);
    });

    test("should throw ValidationError for percentage discount above 100", async () => {
      const product = await createProduct("percentual-invalido");

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [{ product_id: product.id, quantity: 1 }],
          discountType: "percentage",
          discountValue: 150,
          paymentMethodId: paymentMethod.id,
        }),
      ).rejects.toThrow(ValidationError);
    });

    test("should clamp discount to the configured max_discount_in_cents", async () => {
      await pdvSettings.update({ max_discount_in_cents: 300 });
      const product = await createProduct("teto");

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 10 }],
        discountType: "fixed",
        discountValue: 2000,
        paymentMethodId: paymentMethod.id,
      });

      expect(sale.discount_in_cents).toBe(300);

      await pdvSettings.update({ max_discount_in_cents: null });
    });

    test("should apply the LOWER of the value cap and the percentage cap", async () => {
      // Subtotal será 10000 (10 x 1000). Teto por valor = 2000 (20%),
      // teto por percentual = 5% de 10000 = 500 -> o percentual deve vencer.
      await pdvSettings.update({
        max_discount_in_cents: 2000,
        max_discount_percentage: 5,
      });
      const product = await createProduct("teto-combinado");

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 10 }],
        discountType: "fixed",
        discountValue: 9000,
        paymentMethodId: paymentMethod.id,
      });

      expect(sale.discount_in_cents).toBe(500);

      await pdvSettings.update({
        max_discount_in_cents: null,
        max_discount_percentage: null,
      });
    });

    test("should clamp discount to respect the minimum floor", async () => {
      const product = await createProduct("piso", {
        min_unit_price_in_cents: 900,
      });

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        discountType: "fixed",
        discountValue: 500,
        paymentMethodId: paymentMethod.id,
      });

      // Subtotal 1000, piso 900 -> desconto máximo permitido é 100
      expect(sale.discount_in_cents).toBe(100);
      expect(sale.total_in_cents).toBe(900);
    });

    test("should compute change for cash payment", async () => {
      const product = await createProduct("dinheiro-troco");

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        paymentMethodId: paymentMethod.id,
        cashGivenInCents: 1500,
      });

      expect(sale.cash_given_in_cents).toBe(1500);
      expect(sale.change_in_cents).toBe(500);
    });

    test("should throw ValidationError when cash given is insufficient", async () => {
      const product = await createProduct("dinheiro-insuficiente");

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [{ product_id: product.id, quantity: 1 }],
          paymentMethodId: paymentMethod.id,
          cashGivenInCents: 500,
        }),
      ).rejects.toThrow(ValidationError);
    });

    test("should create a sale with a valid payment method variant", async () => {
      const product = await createProduct("com-variante");
      const cardMethodId = variant.payment_method_id;

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        paymentMethodId: cardMethodId,
        paymentMethodVariantId: variant.id,
      });

      expect(sale.payment_method_variant_id).toBe(variant.id);
      expect(sale.payment_method_variant_name_snapshot).toBe(variant.name);
    });

    test("should throw ValidationError when variant does not belong to the payment method", async () => {
      const product = await createProduct("variante-errada");

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [{ product_id: product.id, quantity: 1 }],
          paymentMethodId: paymentMethod.id, // "Dinheiro", não é dono da variante
          paymentMethodVariantId: variant.id,
        }),
      ).rejects.toThrow(ValidationError);
    });

    test("should throw ValidationError when the payment method has variants and none was selected", async () => {
      const product = await createProduct("sem-variante-escolhida");
      const cardMethodId = variant.payment_method_id;

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [{ product_id: product.id, quantity: 1 }],
          paymentMethodId: cardMethodId,
          // paymentMethodVariantId omitido de propósito
        }),
      ).rejects.toThrow(ValidationError);
    });

    test("should store an optional notes field", async () => {
      const product = await createProduct("com-observacao");

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        paymentMethodId: paymentMethod.id,
        notes: "Maria Silva - (11) 99999-0000 - sorteio",
      });

      expect(sale.notes).toBe("Maria Silva - (11) 99999-0000 - sorteio");

      const found = await pdvSale.findById(sale.id);
      expect(found.notes).toBe("Maria Silva - (11) 99999-0000 - sorteio");
    });

    test("should throw ValidationError for an inactive product in the cart", async () => {
      const product = await createProduct("inativo");
      await pdvProduct.remove(product.id);

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [{ product_id: product.id, quantity: 1 }],
          paymentMethodId: paymentMethod.id,
        }),
      ).rejects.toThrow(ValidationError);
    });

    test("should fail atomically with insufficient stock, leaving nothing persisted", async () => {
      const plentifulProduct = await createProduct("atomico-ok", {
        stock_quantity: 100,
      });
      const scarceProduct = await createProduct("atomico-falta", {
        stock_quantity: 1,
      });

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [
            { product_id: plentifulProduct.id, quantity: 5 },
            { product_id: scarceProduct.id, quantity: 5 },
          ],
          paymentMethodId: paymentMethod.id,
        }),
      ).rejects.toMatchObject({ statusCode: 409 });

      const unchangedPlentiful = await pdvProduct.findById(plentifulProduct.id);
      const unchangedScarce = await pdvProduct.findById(scarceProduct.id);
      expect(unchangedPlentiful.stock_quantity).toBe(100);
      expect(unchangedScarce.stock_quantity).toBe(1);
    });
  });

  describe("referential integrity with hard delete", () => {
    test("should block hardDelete of a product referenced by a sale", async () => {
      const product = await createProduct("protegido-por-venda");
      await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        paymentMethodId: paymentMethod.id,
      });

      await expect(pdvProduct.hardDelete(product.id)).rejects.toMatchObject({
        statusCode: 409,
      });
    });

    test("should block hardDelete of a payment method referenced by a sale", async () => {
      const method = await pdvPaymentMethod.create({
        name: "Forma Usada Em Venda",
      });
      const product = await createProduct("forma-protegida-por-venda");
      await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        paymentMethodId: method.id,
      });

      await expect(
        pdvPaymentMethod.hardDelete(method.id),
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    test("should block removeVariant (hard delete) of a variant referenced by a sale", async () => {
      const product = await createProduct("variante-protegida-por-venda");
      await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        paymentMethodId: variant.payment_method_id,
        paymentMethodVariantId: variant.id,
      });

      await expect(
        pdvPaymentMethod.removeVariant(variant.id),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe("cancel", () => {
    test("should restock items exactly and mark the sale as cancelled", async () => {
      const product = await createProduct("cancelar", { stock_quantity: 10 });

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 4 }],
        paymentMethodId: paymentMethod.id,
      });

      const afterSale = await pdvProduct.findById(product.id);
      expect(afterSale.stock_quantity).toBe(6);

      const cancelled = await pdvSale.cancel(
        sale.id,
        seller.id,
        "Erro no pedido",
      );
      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.cancel_reason).toBe("Erro no pedido");

      const afterCancel = await pdvProduct.findById(product.id);
      expect(afterCancel.stock_quantity).toBe(10);
    });

    test("should throw ValidationError when cancelling an already cancelled sale", async () => {
      const product = await createProduct("cancelar-duplo");
      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        paymentMethodId: paymentMethod.id,
      });

      await pdvSale.cancel(sale.id, seller.id, null);

      await expect(pdvSale.cancel(sale.id, seller.id, null)).rejects.toThrow(
        ValidationError,
      );
    });

    test("should throw NotFoundError when cancelling a non-existent sale", async () => {
      const fakeUUID = "00000000-0000-4000-8000-000000000000";
      await expect(pdvSale.cancel(fakeUUID, seller.id, null)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
