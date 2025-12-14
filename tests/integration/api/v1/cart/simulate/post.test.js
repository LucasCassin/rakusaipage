import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import product from "models/product.js";
import session from "models/session.js";
import cart from "models/cart.js";
import coupon from "models/coupon.js";
import { number } from "joi";

describe("POST /api/v1/cart/simulate", () => {
  let userSession, testProduct;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Setup Básico
    let buyer = await user.create({
      username: "simpler",
      email: "sim@test.com",
      password: "StrongPassword123@",
    });
    buyer = await user.update({
      id: buyer.id,
      password: "StrongPassword123@",
    });
    userSession = await session.create(buyer);

    testProduct = await product.create({
      name: "Prod Simulação",
      slug: "prod-sim",
      description: "...",
      category: "Test",
      price_in_cents: 10000, // R$ 100,00
      minimum_price_in_cents: 100,
      stock_quantity: 100,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
      is_active: true,
      images: [],
      allow_pickup: true,
      allow_delivery: true,
      pickup_address: "Rua Teste ABC",
      pickup_instructions: "Instrucoes de retirada",
    });

    await coupon.create({
      code: "TESTE20",
      discount_percentage: 20, // 20%
      is_cumulative: false,
      description: "Cupom de Teste",
    });
  });

  test("should calculate totals for GUEST (raw items) with shipping and coupon", async () => {
    // Cenário:
    // Item: 2 x 100,00 = 200,00
    // Frete (Mock PAC): 21,00
    // Cupom (20% de 200): 40,00
    // Total Esperado: 200 + 21 - 40 = 181,00 (18100 cents)

    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/cart/simulate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_address_snapshot: { zip: "12345-678", number: "123" },
          shipping_method: "PAC",
          coupon_codes: ["TESTE20"],
          items: [{ product_id: testProduct.id, quantity: 2 }],
        }),
      },
    );

    const body = await response.json();
    expect(response.status).toBe(200);

    expect(body.subtotal).toBe(20000);
    expect(body.shipping_cost).toBe(2100); // Mock do ambiente de teste
    expect(body.discount).toBe(4000);
    expect(body.total).toBe(18100);
    expect(body.applied_coupons[0].code).toBe("TESTE20");
    expect(body.shipping_details.carrier).toBe("Correios");
  });

  test("should calculate totals for LOGGED user (db items)", async () => {
    // 1. Popula carrinho no banco
    await cart.addItem(userSession.user_id, {
      product_id: testProduct.id,
      quantity: 1,
    }); // 100,00

    // 2. Simula sem mandar items no body
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/cart/simulate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${userSession.token}`,
        },
        body: JSON.stringify({
          shipping_address_snapshot: { zip: "12345-678", number: "123" },
          shipping_method: "PAC",
          // Sem coupon
        }),
      },
    );

    const body = await response.json();
    expect(response.status).toBe(200);

    // 10000 (prod) + 2100 (frete) = 12100
    expect(body.subtotal).toBe(10000);
    expect(body.total).toBe(12100);
  });

  test("should return error if product does not exist (Guest Mode)", async () => {
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/cart/simulate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_address_snapshot: { zip: "12345678", number: "123" },
          shipping_method: "PAC",
          items: [
            {
              product_id: orchestrator.generateRandomUUIDV4(),
              quantity: 1,
            },
          ],
        }),
      },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.message).toMatch(/Produto não encontrado/);
  });

  test("should return error if shipping method is unavailable", async () => {
    const response = await fetch(
      `${orchestrator.webserverUrl}/api/v1/cart/simulate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_address_snapshot: { zip: "12345678", number: "123" },
          shipping_method: "TELETRANSPORTE", // Inválido
          items: [{ product_id: testProduct.id, quantity: 1 }],
        }),
      },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/método de entrega/i);
  });
});
