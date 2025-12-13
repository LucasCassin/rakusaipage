import order from "models/order.js";
import cart from "models/cart.js";
import product from "models/product.js";
import coupon from "models/coupon.js";
import { ValidationError, ServiceError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";

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

    // Criamos um produto com estoque controlado (10 unidades)
    const prod = await product.create({
      name: "Produto Pedido",
      slug: "prod-pedido",
      description: "Desc",
      category: "Test",
      price_in_cents: 5000,
      minimum_price_in_cents: 1000,
      stock_quantity: 11, // ESTOQUE INICIAL
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      images: [],
    });
    productId = prod.id;

    const prod2 = await product.create({
      name: "Produto Pedido 2",
      slug: "prod-pedido-2",
      description: "Desc",
      category: "Test",
      price_in_cents: 5000,
      minimum_price_in_cents: 1000,
      stock_quantity: 1000, // ESTOQUE INICIAL
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      images: [],
    });
    productId2 = prod2.id;
  });

  beforeEach(async () => {
    await cart.clearCart(userId);
  });

  test("should create an order successfully from a cart", async () => {
    await cart.addItem(userId, { product_id: productId, quantity: 2 });

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { street: "Rua Teste", number: "123" },
      shippingCostInCents: 2000,
      shippingMethod: "PAC",
    });

    expect(newOrder.id).toBeDefined();
    expect(newOrder.status).toBe("pending");
    expect(newOrder.subtotal_in_cents).toBe(10000);
    expect(newOrder.total_in_cents).toBe(12000);
  });

  test("should reduce stock quantity when order is created", async () => {
    // Estoque inicial era 11. Teste anterior comprou 2. Estoque atual deve ser 9.
    // Vamos comprar mais 3.
    await cart.addItem(userId, { product_id: productId, quantity: 3 });

    await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "000" },
      shippingCostInCents: 1000,
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
      shippingAddress: {},
      shippingCostInCents: 0,
      shippingMethod: "PICKUP",
    });

    await expect(promise).rejects.toThrow(ValidationError);
    await expect(promise).rejects.toThrow(/insuficiente/);

    // O estoque deve permanecer 6 (Rollback funcionou)
    const dbProduct = await product.findById(productId);
    expect(dbProduct.stock_quantity).toBe(6);
  });

  test("should return items to stock when order is canceled", async () => {
    // 1. Compra 2 itens. Estoque (6) vai para (4).
    await cart.addItem(userId, { product_id: productId, quantity: 2 });
    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "123" },
      shippingCostInCents: 1000,
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
    // Setup: Cria pedido
    await cart.addItem(userId, { product_id: productId, quantity: 1 });
    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: {},
      shippingCostInCents: 0,
      shippingMethod: "PAC",
    });

    // Simula envio (atualização manual via orchestrator/query pois não temos model method para 'ship')
    // Precisamos importar database ou usar orchestrator query
    const db = await import("infra/database.js").then((m) => m.default);
    await db.query({
      text: "UPDATE orders SET status = 'shipped' WHERE id = $1",
      values: [newOrder.id],
    });

    // Tenta cancelar
    await expect(order.cancel(newOrder.id)).rejects.toThrow(ServiceError);
    await expect(order.cancel(newOrder.id)).rejects.toThrow(/enviado/);
  });

  test("should create an order with coupon applied using 'code' parameter", async () => {
    await coupon.create({
      code: "DESCONTO10",
      description: "10 off",
      discount_percentage: 10,
    });

    await cart.addItem(userId, { product_id: productId, quantity: 1 });

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "00000" },
      shippingCostInCents: 1000,
      couponCodes: ["DESCONTO10"],
      shippingMethod: "PAC",
    });

    expect(newOrder.discount_in_cents).toBe(500);
    expect(newOrder.total_in_cents).toBe(5500);
  });

  // NOVO TESTE DE HARD FLOOR
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
    });

    await coupon.create({
      code: "SUPER50",
      description: "50 off",
      discount_percentage: 50,
    });

    await cart.addItem(userId, { product_id: floorProduct.id, quantity: 2 });

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: {},
      shippingCostInCents: 0,
      couponCodes: ["SUPER50"],
      shippingMethod: "PAC",
    });

    expect(newOrder.subtotal_in_cents).toBe(20000);
    expect(newOrder.discount_in_cents).toBe(4000); // Travou em 40 reais
    expect(newOrder.total_in_cents).toBe(16000); // Respeitou o piso
  });

  test("should fail to create order if cart is empty", async () => {
    const promise = order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: {},
      shippingCostInCents: 0,
      shippingMethod: "PAC",
    });

    await expect(promise).rejects.toThrow(ValidationError);
  });

  test("should update payment info with gateway data", async () => {
    await cart.addItem(userId, { product_id: productId, quantity: 1 });
    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "123" },
      shippingCostInCents: 1000,
      shippingMethod: "SEDEX",
    });

    const gatewayMock = {
      gatewayId: "123456789",
      gatewayData: {
        qr_code: "000201010212...",
        ticket_url: "https://mercadopago.com/...",
      },
      status: "pending",
    };

    const updatedOrder = await order.updatePaymentInfo(
      newOrder.id,
      gatewayMock,
    );

    expect(updatedOrder.payment_gateway_id).toBe("123456789");
    expect(updatedOrder.gateway_data.qr_code).toBe(
      gatewayMock.gatewayData.qr_code,
    );
    expect(updatedOrder.status).toBe("pending");
  });

  test("should save shipping method and details in order", async () => {
    await cart.addItem(userId, { product_id: productId, quantity: 1 });

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "123" },
      shippingCostInCents: 1500,
      shippingMethod: "PAC",
      shippingDetails: { carrier: "Correios", days: 5 },
    });

    expect(newOrder.shipping_method).toBe("PAC");
    expect(newOrder.shipping_details.carrier).toBe("Correios");
  });

  test("should apply free shipping coupon (100% off shipping)", async () => {
    // 1. Cria cupom de frete grátis para compras acima de R$ 30,00
    await coupon.create({
      code: "FRETEGRATIS",
      discount_percentage: 100,
      expiration_date: new Date(Date.now() + 86400000), // Amanhã
      min_purchase_amount: 3000,
      description: "100% de frete grátis",
      type: "shipping",
      max_discount_in_cents: null, // Sem limite
    });

    // 2. Compra produto de 50 reais (Passa do mínimo)
    await cart.addItem(userId, { product_id: productId, quantity: 1 }); // 50.00

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: {},
      shippingCostInCents: 2500, // Frete R$ 25,00
      couponCodes: ["FRETEGRATIS"],
      shippingMethod: "PAC",
    });

    // Subtotal: 5000
    // Frete: 2500
    // Desconto: 2500 (100% do frete)
    // Total: 5000 + 2500 - 2500 = 5000
    expect(newOrder.shipping_cost_in_cents).toBe(2500);
    expect(newOrder.discount_in_cents).toBe(2500);
    expect(newOrder.total_in_cents).toBe(5000);
  });

  // NOVO: Teste de Cupom de Frete com TETO (Limitado a R$ 50)
  test("should cap shipping discount at max_discount_in_cents", async () => {
    // 1. Cupom: 100% de frete, mas limitado a R$ 50,00
    await coupon.create({
      code: "FRETELIMITADO",
      discount_percentage: 100,
      description: "100% de frete",
      expiration_date: new Date(Date.now() + 86400000),
      min_purchase_amount: 0,
      type: "shipping",
      max_discount_in_cents: 5000, // Max R$ 50,00
    });

    await cart.addItem(userId, { product_id: productId, quantity: 1 });

    // 2. Frete Caro (R$ 80,00)
    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: {},
      shippingCostInCents: 8000,
      couponCodes: ["FRETELIMITADO"],
      shippingMethod: "SEDEX",
    });

    // Desconto esperado: 5000 (Teto), e não 8000
    // Total: 5000 (Prod) + 8000 (Frete) - 5000 (Desc) = 8000
    expect(newOrder.discount_in_cents).toBe(5000);
    expect(newOrder.total_in_cents).toBe(8000);
  });

  // NOVO: Teste de Mínimo de Compra no Cupom de Frete
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
      shippingAddress: {},
      shippingCostInCents: 2000,
      couponCodes: ["FRETECARO"],
      shippingMethod: "PAC",
    });

    // Deve falhar pois subtotal (5000) < minimo (10000)
    await expect(promise).rejects.toThrow(ValidationError);
  });

  test("should choose the best discount strategy (Cumulative vs Single Best)", async () => {
    // Cenário:
    // Cupom A: 10% (Cumulativo) -> R$ 100,00
    // Cupom B: 20% (Cumulativo) -> R$ 200,00
    // Cupom C: 50% (NÃO Cumulativo) -> R$ 500,00
    // Subtotal: R$ 1000,00

    // Estratégia Cumulativa (A+B): 10% + 20% = 30% (R$ 300,00)
    // Estratégia Individual (C): 50% (R$ 500,00)
    // Vencedor: C (R$ 500,00)

    await coupon.create({
      code: "CUMULATIVO10",
      discount_percentage: 10,
      is_cumulative: true,
      description: "10% off",
    });
    await coupon.create({
      code: "CUMULATIVO20",
      discount_percentage: 20,
      is_cumulative: true,
      description: "20% off",
    });
    await coupon.create({
      code: "UNICO50",
      discount_percentage: 50,
      is_cumulative: false,
      description: "50% off",
    });

    // Compra de R$ 1000,00
    await cart.addItem(userId, { product_id: productId2, quantity: 10 }); // 10 * 1000 = 10000 cents (ops, price unit is 5000 in setup)
    // Setup do beforeAll cria produto de 5000 (R$ 50). Quantity 20 = R$ 1000,00
    await cart.clearCart(userId);
    await cart.addItem(userId, { product_id: productId2, quantity: 20 });

    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: {},
      shippingCostInCents: 0,
      couponCodes: ["CUMULATIVO10", "CUMULATIVO20", "UNICO50"], // Manda os 3
      shippingMethod: "PAC",
    });

    // Esperado: Ganhou o UNICO50 (50% de 1000 = 500)
    expect(newOrder.discount_in_cents).toBe(50000);

    // Verifica se salvou corretamente
    const applied = newOrder.applied_coupons; // JSONB
    expect(applied).toHaveLength(1);
    expect(applied[0].code).toBe("UNICO50");
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
      shippingAddress: {},
      shippingCostInCents: 0,
      couponCodes: ["CUMU20A", "CUMU20B", "WEAK10"],
      shippingMethod: "PAC",
    });

    expect(newOrder.discount_in_cents).toBe(40000); // 400 reais
    expect(newOrder.applied_coupons).toHaveLength(2); // Usou 2 cupons
  });
});
