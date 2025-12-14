import order from "models/order.js";
import cart from "models/cart.js";
import product from "models/product.js";
import coupon from "models/coupon.js";
import { ValidationError, ServiceError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import { number } from "joi";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: Order", () => {
  let user1, userId;
  let productId, productId2;

  beforeAll(async () => {
    user1 = await user.create({
      username: "cart",
      email: "cart@test.com",
      password: "StrongPassword123@",
    });
    userId = user1.id;

    // Produto 1: Preço 50.00 | Estoque 11
    const prod = await product.create({
      name: "Produto Pedido",
      slug: "prod-pedido",
      description: "Desc",
      category: "Test",
      price_in_cents: 5000,
      minimum_price_in_cents: 1000,
      stock_quantity: 11,
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
    productId = prod.id;

    // Produto 2: Preço 50.00 | Estoque 1000 (Para testes de alto valor)
    const prod2 = await product.create({
      name: "Produto Pedido 2",
      slug: "prod-pedido-2",
      description: "Desc",
      category: "Test",
      price_in_cents: 5000,
      minimum_price_in_cents: 1000,
      stock_quantity: 1000,
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
    productId2 = prod2.id;
  });

  beforeEach(async () => {
    await cart.clearCart(userId);
  });

  test("should create an order successfully from a cart (recalculating shipping)", async () => {
    await cart.addItem(userId, { product_id: productId, quantity: 2 }); // 100.00

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: {
        street: "Rua Teste",
        number: "123",
        zip: "12345-678",
      },
      shippingMethod: "PAC", // Mocked to 2100 in test env
    });

    expect(newOrder.id).toBeDefined();
    expect(newOrder.status).toBe("pending");
    expect(newOrder.subtotal_in_cents).toBe(10000); // 2 * 5000
    expect(newOrder.shipping_cost_in_cents).toBe(2100); // Mock do PAC
    expect(newOrder.total_in_cents).toBe(12100); // 10000 + 2100
  });

  test("should reduce stock quantity when order is created", async () => {
    // Estoque inicial era 11. Teste anterior comprou 2. Estoque atual deve ser 9.
    // Vamos comprar mais 3.
    await cart.addItem(userId, { product_id: productId, quantity: 3 });

    await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      shippingMethod: "PAC",
    });

    // Verifica no banco
    const dbProduct = await product.findById(productId);
    expect(dbProduct.stock_quantity).toBe(6); // 9 - 3 = 6
  });

  test("should fail if product stock is insufficient (and not change stock)", async () => {
    // Estoque atual é 6. Tentar comprar 7.
    await cart.addItem(userId, { product_id: productId, quantity: 7 });

    const promise = order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      shippingMethod: "PAC",
    });

    await expect(promise).rejects.toThrow(ValidationError);
    await expect(promise).rejects.toThrow(/insuficiente/);

    const dbProduct = await product.findById(productId);
    expect(dbProduct.stock_quantity).toBe(6);
  });

  test("should return items to stock when order is canceled", async () => {
    // 1. Compra 2 itens. Estoque (6) vai para (4).
    await cart.addItem(userId, { product_id: productId, quantity: 2 });
    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "12345678", number: "123" },
      shippingMethod: "PAC",
    });

    let dbProduct = await product.findById(productId);
    expect(dbProduct.stock_quantity).toBe(4);

    // 2. Cancela Pedido
    const canceledOrder = await order.cancel(newOrder.id);
    expect(canceledOrder.status).toBe("canceled");

    // 3. Verifica retorno de estoque (4 + 2 = 6)
    dbProduct = await product.findById(productId);
    expect(dbProduct.stock_quantity).toBe(6);
  });

  test("should fail to cancel if order is already shipped", async () => {
    await cart.addItem(userId, { product_id: productId, quantity: 1 });
    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      shippingMethod: "PAC",
    });

    // Simula envio (atualização manual via query pois não temos model method para 'ship')
    const db = await import("infra/database.js").then((m) => m.default);
    await db.query({
      text: "UPDATE orders SET status = 'shipped' WHERE id = $1",
      values: [newOrder.id],
    });

    await expect(order.cancel(newOrder.id)).rejects.toThrow(ServiceError);
    await expect(order.cancel(newOrder.id)).rejects.toThrow(/enviado/);
  });

  test("should save shipping method and details in order", async () => {
    await cart.addItem(userId, { product_id: productId, quantity: 1 });

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "12345678", number: "123" },
      shippingMethod: "PAC",
    });

    expect(newOrder.shipping_method).toBe("PAC");
    // O mock retorna 'carrier: Correios' dentro de shipping_details
    expect(newOrder.shipping_details.carrier).toBe("Correios");
  });

  test("should create an order with coupon applied using 'couponCodes' parameter", async () => {
    await coupon.create({
      code: "DESCONTO10",
      description: "10 off",
      discount_percentage: 10,
    });

    await cart.addItem(userId, { product_id: productId, quantity: 1 }); // 5000 cents

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      couponCodes: ["DESCONTO10"],
      shippingMethod: "PAC",
    });

    // Subtotal: 5000
    // Desconto: 500 (10%)
    // Frete: 2100 (Mock)
    // Total: 5000 + 2100 - 500 = 6600
    expect(newOrder.subtotal_in_cents).toBe(5000);
    expect(newOrder.discount_in_cents).toBe(500);
    expect(newOrder.shipping_cost_in_cents).toBe(2100);
    expect(newOrder.total_in_cents).toBe(6600);
  });

  test("should cap discount if it violates product minimum price (Hard Floor)", async () => {
    const floorProduct = await product.create({
      name: "Produto Margem Baixa",
      slug: "margin-test",
      description: "...",
      category: "Test",
      price_in_cents: 10000,
      minimum_price_in_cents: 8000,
      stock_quantity: 10,
      weight_in_grams: 10,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      images: [],
      allow_pickup: true,
      allow_delivery: true,
      pickup_address: "Rua Teste ABC",
      pickup_instructions: "Instrucoes de retirada",
    });

    await coupon.create({
      code: "SUPER50",
      description: "50 off",
      discount_percentage: 50,
    });

    await cart.addItem(userId, { product_id: floorProduct.id, quantity: 2 }); // 20000

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      couponCodes: ["SUPER50"],
      shippingMethod: "PAC",
    });

    // Subtotal: 20000
    // Floor: 16000 (2 * 8000)
    // Max Discount Possível: 4000
    // Desconto Calculado (50%): 10000 -> Travado em 4000
    // Shipping: 2100
    // Total: 20000 + 2100 - 4000 = 18100
    expect(newOrder.discount_in_cents).toBe(4000);
    expect(newOrder.total_in_cents).toBe(18100);
  });

  test("should fail to create order if cart is empty", async () => {
    const promise = order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      shippingMethod: "PAC",
    });

    await expect(promise).rejects.toThrow(ValidationError);
  });

  test("should update payment info with gateway data", async () => {
    await cart.addItem(userId, { product_id: productId, quantity: 1 });
    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "12345678", number: "123" },
      shippingMethod: "PAC",
    });

    const gatewayMock = {
      gatewayId: "123456789",
      gatewayData: {
        qr_code: "...",
        ticket_url: "...",
      },
      status: "pending",
    };

    const updatedOrder = await order.updatePaymentInfo(
      newOrder.id,
      gatewayMock,
    );

    expect(updatedOrder.payment_gateway_id).toBe("123456789");
    expect(updatedOrder.status).toBe("pending");
  });

  test("should apply free shipping coupon (100% off shipping)", async () => {
    await coupon.create({
      code: "FRETEGRATIS",
      discount_percentage: 100,
      expiration_date: new Date(Date.now() + 86400000),
      min_purchase_amount: 3000,
      description: "Frete Gratis",
      type: "shipping",
    });

    await cart.addItem(userId, { product_id: productId, quantity: 1 });

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      couponCodes: ["FRETEGRATIS"],
      shippingMethod: "PAC",
    });

    // Shipping: 2100 (Mock)
    // Discount: 2100 (100%)
    expect(newOrder.shipping_cost_in_cents).toBe(2100);
    expect(newOrder.discount_in_cents).toBe(2100);
    expect(newOrder.total_in_cents).toBe(5000); // 5000 + 2100 - 2100
  });

  test("should cap shipping discount at max_discount_in_cents", async () => {
    // O frete no ambiente de teste é fixo em 2100.
    // Vamos criar um teto de 1000.
    await coupon.create({
      code: "FRETELIMITADO",
      discount_percentage: 100, // Tenta dar 100% (2100)
      description: "100% de frete limitado a 10 reais",
      expiration_date: new Date(Date.now() + 86400000),
      min_purchase_amount: 0,
      type: "shipping",
      max_discount_in_cents: 1000, // Teto R$ 10,00
    });

    await cart.addItem(userId, { product_id: productId, quantity: 1 });

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      couponCodes: ["FRETELIMITADO"],
      shippingMethod: "PAC",
    });

    expect(newOrder.shipping_cost_in_cents).toBe(2100);
    expect(newOrder.discount_in_cents).toBe(1000); // Travado no teto
    expect(newOrder.total_in_cents).toBe(6100); // 5000 + 2100 - 1000
  });

  test("should fail shipping coupon if product subtotal is too low", async () => {
    await coupon.create({
      code: "FRETECARO",
      discount_percentage: 100,
      description: "100% de frete",
      expiration_date: new Date(Date.now() + 86400000),
      min_purchase_amount: 10000, // Mínimo R$ 100,00
      type: "shipping",
    });

    // Compra só R$ 50,00
    await cart.addItem(userId, { product_id: productId, quantity: 1 });

    const promise = order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      couponCodes: ["FRETECARO"],
      shippingMethod: "PAC",
    });

    await expect(promise).rejects.toThrow(ValidationError);
  });

  test("should choose the best discount strategy (Cumulative vs Single Best)", async () => {
    // Cenário:
    // Cupom A: 10% (Cumulativo)
    // Cupom B: 20% (Cumulativo)
    // Cupom C: 50% (NÃO Cumulativo)
    // Subtotal: R$ 1000,00 (20 * 50)

    await coupon.create({
      code: "CUMULATIVO10",
      discount_percentage: 10,
      is_cumulative: true,
      description: "10",
    });
    await coupon.create({
      code: "CUMULATIVO20",
      discount_percentage: 20,
      is_cumulative: true,
      description: "20",
    });
    await coupon.create({
      code: "UNICO50",
      discount_percentage: 50,
      is_cumulative: false,
      description: "50",
    });

    await cart.clearCart(userId);
    await cart.addItem(userId, { product_id: productId2, quantity: 20 });

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      couponCodes: ["CUMULATIVO10", "CUMULATIVO20", "UNICO50"],
      shippingMethod: "PAC",
    });

    // Estratégia Cumulativa (A+B): 10+20=30% -> R$ 300
    // Estratégia Individual (C): 50% -> R$ 500
    // Vencedor: C
    expect(newOrder.discount_in_cents).toBe(50000);
    expect(newOrder.applied_coupons).toHaveLength(1);
    expect(newOrder.applied_coupons[0].code).toBe("UNICO50");
  });

  test("should sum cumulative coupons if they are better than single", async () => {
    // Cupom A: 20% (Cumulativo)
    // Cupom B: 20% (Cumulativo)
    // Cupom C: 10% (NÃO Cumulativo)
    // Vencedor: A+B (40%)

    await coupon.create({
      code: "CUMU20A",
      discount_percentage: 20,
      is_cumulative: true,
      description: "20% off",
    });
    await coupon.create({
      code: "CUMU20B",
      discount_percentage: 20,
      is_cumulative: true,
      description: "20% off",
    });
    await coupon.create({
      code: "WEAK10",
      discount_percentage: 10,
      is_cumulative: false,
      description: "10% off",
    });

    await cart.clearCart(userId);
    await cart.addItem(userId, { product_id: productId2, quantity: 20 }); // R$ 1000,00

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000000", number: "123" },
      couponCodes: ["CUMU20A", "CUMU20B", "WEAK10"],
      shippingMethod: "PAC",
    });

    expect(newOrder.discount_in_cents).toBe(40000); // 400 reais
    expect(newOrder.applied_coupons).toHaveLength(2); // Usou 2 cupons
  });
});
