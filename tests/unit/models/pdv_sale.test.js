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

  const singlePayment = (amountInCents, overrides = {}) => [
    {
      payment_method_id: paymentMethod.id,
      amount_in_cents: amountInCents,
      ...overrides,
    },
  ];

  describe("create", () => {
    test("should create a sale without discount and decrement stock", async () => {
      const product = await createProduct("sem-desconto");

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 3 }],
        payments: singlePayment(3000),
      });

      expect(sale.subtotal_in_cents).toBe(3000);
      expect(sale.discount_in_cents).toBe(0);
      expect(sale.total_in_cents).toBe(3000);
      expect(sale.items).toHaveLength(1);
      expect(sale.payments).toHaveLength(1);
      expect(sale.payments[0].amount_in_cents).toBe(3000);

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
        payments: singlePayment(9000),
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
        payments: singlePayment(9500),
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
          payments: singlePayment(1000),
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
        payments: singlePayment(9700),
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
        payments: singlePayment(9500),
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
        payments: singlePayment(900),
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
        payments: singlePayment(1000, { cash_given_in_cents: 1500 }),
      });

      expect(sale.payments[0].cash_given_in_cents).toBe(1500);
      expect(sale.payments[0].change_in_cents).toBe(500);
    });

    test("should throw ValidationError when cash given is insufficient", async () => {
      const product = await createProduct("dinheiro-insuficiente");

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [{ product_id: product.id, quantity: 1 }],
          payments: singlePayment(1000, { cash_given_in_cents: 500 }),
        }),
      ).rejects.toThrow(ValidationError);
    });

    test("should create a sale with a valid payment method variant", async () => {
      const product = await createProduct("com-variante");
      const cardMethodId = variant.payment_method_id;

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [
          {
            payment_method_id: cardMethodId,
            payment_method_variant_id: variant.id,
            amount_in_cents: 1000,
          },
        ],
      });

      expect(sale.payments[0].payment_method_variant_id).toBe(variant.id);
      expect(sale.payments[0].payment_method_variant_name_snapshot).toBe(
        variant.name,
      );
    });

    test("should throw ValidationError when variant does not belong to the payment method", async () => {
      const product = await createProduct("variante-errada");

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [
            {
              payment_method_id: paymentMethod.id, // "Dinheiro", não é dono da variante
              payment_method_variant_id: variant.id,
              amount_in_cents: 1000,
            },
          ],
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
          payments: [
            {
              payment_method_id: cardMethodId,
              // payment_method_variant_id omitido de propósito
              amount_in_cents: 1000,
            },
          ],
        }),
      ).rejects.toThrow(ValidationError);
    });

    test("should store an optional notes field", async () => {
      const product = await createProduct("com-observacao");

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        payments: singlePayment(1000),
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
          payments: singlePayment(1000),
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
          payments: singlePayment(10000),
        }),
      ).rejects.toMatchObject({ statusCode: 409 });

      const unchangedPlentiful = await pdvProduct.findById(plentifulProduct.id);
      const unchangedScarce = await pdvProduct.findById(scarceProduct.id);
      expect(unchangedPlentiful.stock_quantity).toBe(100);
      expect(unchangedScarce.stock_quantity).toBe(1);
    });
  });

  describe("create with split payments", () => {
    test("should create a sale split across two payment methods", async () => {
      const product = await createProduct("split-dois", {
        price_in_cents: 10000,
      });
      const cardMethodId = variant.payment_method_id;

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [
          { payment_method_id: paymentMethod.id, amount_in_cents: 4000 },
          {
            payment_method_id: cardMethodId,
            payment_method_variant_id: variant.id,
            amount_in_cents: 6000,
          },
        ],
      });

      expect(sale.total_in_cents).toBe(10000);
      expect(sale.payments).toHaveLength(2);
      const total = sale.payments.reduce(
        (acc, p) => acc + p.amount_in_cents,
        0,
      );
      expect(total).toBe(10000);
    });

    test("should compute change independently for the cash leg of a split payment", async () => {
      const product = await createProduct("split-troco", {
        price_in_cents: 10000,
      });
      const cardMethodId = variant.payment_method_id;

      const sale = await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        payments: [
          {
            payment_method_id: cardMethodId,
            payment_method_variant_id: variant.id,
            amount_in_cents: 6000,
          },
          {
            payment_method_id: paymentMethod.id,
            amount_in_cents: 4000,
            cash_given_in_cents: 5000,
          },
        ],
      });

      const cashLeg = sale.payments.find(
        (p) => p.payment_method_id === paymentMethod.id,
      );
      const cardLeg = sale.payments.find(
        (p) => p.payment_method_id === cardMethodId,
      );
      expect(cashLeg.change_in_cents).toBe(1000);
      expect(cardLeg.cash_given_in_cents).toBeNull();
      expect(cardLeg.change_in_cents).toBeNull();
    });

    test("should throw ValidationError when the sum of payments does not match the total", async () => {
      const product = await createProduct("split-soma-errada", {
        price_in_cents: 10000,
      });
      const cardMethodId = variant.payment_method_id;

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [
            { payment_method_id: paymentMethod.id, amount_in_cents: 4000 },
            {
              payment_method_id: cardMethodId,
              payment_method_variant_id: variant.id,
              amount_in_cents: 5000,
            },
          ],
        }),
      ).rejects.toThrow(ValidationError);
    });

    test("should throw ValidationError when cash given is insufficient for its own leg, even if another leg covers the rest", async () => {
      const product = await createProduct("split-dinheiro-insuficiente", {
        price_in_cents: 10000,
      });
      const cardMethodId = variant.payment_method_id;

      await expect(
        pdvSale.create({
          sellerId: seller.id,
          items: [{ product_id: product.id, quantity: 1 }],
          payments: [
            {
              payment_method_id: paymentMethod.id,
              amount_in_cents: 4000,
              cash_given_in_cents: 2000,
            },
            {
              payment_method_id: cardMethodId,
              payment_method_variant_id: variant.id,
              amount_in_cents: 6000,
            },
          ],
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("referential integrity with hard delete", () => {
    test("should block hardDelete of a product referenced by a sale", async () => {
      const product = await createProduct("protegido-por-venda");
      await pdvSale.create({
        sellerId: seller.id,
        items: [{ product_id: product.id, quantity: 1 }],
        payments: singlePayment(1000),
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
        payments: [{ payment_method_id: method.id, amount_in_cents: 1000 }],
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
        payments: [
          {
            payment_method_id: variant.payment_method_id,
            payment_method_variant_id: variant.id,
            amount_in_cents: 1000,
          },
        ],
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
        payments: singlePayment(4000),
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
        payments: singlePayment(1000),
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
