import order from "models/order.js";
import cart from "models/cart.js";
import product from "models/product.js";
import coupon from "models/coupon.js";
import { ValidationError } from "errors/index.js";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Model: Order", () => {
  let user1, userId;
  let productId;

  beforeAll(async () => {
    user1 = await user.create({
      username: "cart",
      email: "cart@test.com",
      password: "StrongPassword123@",
    });
    userId = user1.id;

    const prod = await product.create({
      name: "Produto Pedido",
      slug: "prod-pedido",
      description: "Desc",
      category: "Test",
      price_in_cents: 5000,
      minimum_price_in_cents: 1000,
      stock_quantity: 100,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      images: [],
    });
    productId = prod.id;
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
      couponCode: "DESCONTO10",
      shippingMethod: "PAC",
    });

    expect(newOrder.discount_in_cents).toBe(500);
    expect(newOrder.total_in_cents).toBe(5500);
  });

  // NOVO TESTE DE HARD FLOOR
  test("should cap discount if it violates product minimum price (Hard Floor)", async () => {
    // 1. Cria produto com margem apertada
    // Preço: 100,00 | Mínimo: 80,00
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

    // 2. Cupom Agressivo: 50% de desconto
    // Se aplicado puramente: 50% de 100,00 = 50,00. Preço final seria 50,00.
    // MAS o mínimo é 80,00. Logo, o desconto máximo permitido é 20,00.
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
      couponCode: "SUPER50",
      shippingMethod: "PAC",
    });

    // Verificação
    // Subtotal: 20000
    // Desconto Esperado: 4000 (Para não baixar de 16000)
    // Total: 16000
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

  test("should fail if product stock is insufficient", async () => {
    await cart.addItem(userId, { product_id: productId, quantity: 101 });

    const promise = order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: {},
      shippingCostInCents: 0,
      shippingMethod: "PICKUP",
    });

    await expect(promise).rejects.toThrow("Estoque insuficiente");
  });

  test("should update payment info with gateway data", async () => {
    // 1. Cria um pedido base
    await cart.addItem(userId, { product_id: productId, quantity: 1 });
    const newOrder = await order.createFromCart({
      userId,
      paymentMethod: "pix",
      shippingAddress: { zip: "123" },
      shippingCostInCents: 1000,
      shippingMethod: "SEDEX",
    });

    // 2. Simula dados do Mercado Pago
    const gatewayMock = {
      gatewayId: "123456789",
      gatewayData: {
        qr_code: "000201010212...",
        ticket_url: "https://mercadopago.com/...",
      },
      status: "pending",
    };

    // 3. Atualiza
    const updatedOrder = await order.updatePaymentInfo(
      newOrder.id,
      gatewayMock,
    );

    // 4. Valida
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
      // Novos dados vindos do frontend
      shippingMethod: "PAC",
      shippingDetails: { carrier: "Correios", days: 5 },
    });

    expect(newOrder.shipping_method).toBe("PAC");
    expect(newOrder.shipping_details.carrier).toBe("Correios");
  });
});
