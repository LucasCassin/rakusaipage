import salesAnalytics from "models/sales_analytics.js";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import product from "models/product.js";
import database from "infra/database.js";
import { ValidationError } from "errors/index.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Sales Analytics Model", () => {
  let user1;
  let productA, productB;

  beforeAll(async () => {
    // Cria Usuário para os pedidos
    user1 = await user.create({
      username: "analyticsUser",
      email: "analytics@test.com",
      password: "StrongPassword123@",
    });

    // Cria Produtos para os itens
    productA = await product.create({
      name: "Product A",
      slug: "prod-a",
      description: "Desc A",
      category: "Category 1",
      price_in_cents: 1000,
      minimum_price_in_cents: 500,
      stock_quantity: 100,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
    });

    productB = await product.create({
      name: "Product B",
      slug: "prod-b",
      description: "Desc B",
      category: "Category 2",
      price_in_cents: 2000,
      minimum_price_in_cents: 1000,
      stock_quantity: 100,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
    });
  });

  // Helper para criar pedidos diretamente no banco (bypassing validações de API para testar cenários diversos)
  async function createOrder({
    status,
    total,
    shipping = 0,
    discount = 0,
    paymentMethod = "pix",
    shippingMethod = "PAC",
    createdAt = new Date(),
    items = [],
  }) {
    const client = await database.getNewClient();
    try {
      const res = await client.query({
        text: `
          INSERT INTO orders (
            user_id, code, status, total_in_cents, subtotal_in_cents,
            shipping_cost_in_cents, discount_in_cents, payment_method,
            shipping_method, shipping_address_snapshot, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '{}', $10, $10)
          RETURNING id
        `,
        values: [
          user1.id,
          `ORD-${Math.random().toString(36).substring(7)}`,
          status,
          total,
          total - shipping + discount,
          shipping,
          discount,
          paymentMethod,
          shippingMethod,
          createdAt,
        ],
      });
      const orderId = res.rows[0].id;

      for (const item of items) {
        await client.query({
          text: `
            INSERT INTO order_items (
              order_id, product_id, product_name_snapshot, quantity,
              unit_price_in_cents, total_in_cents
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `,
          values: [
            orderId,
            item.product_id,
            "Snapshot",
            item.quantity,
            item.price,
            item.price * item.quantity,
          ],
        });
      }
      return orderId;
    } finally {
      await client.end();
    }
  }

  beforeEach(async () => {
    await orchestrator.clearTable("order_items");
    await orchestrator.clearTable("orders");
  });

  test("should calculate basic KPIs correctly for valid orders", async () => {
    // Pedido 1: Pago, R$ 100,00 total, R$ 10,00 frete
    await createOrder({
      status: "paid",
      total: 10000,
      shipping: 1000,
      items: [{ product_id: productA.id, quantity: 1, price: 9000 }],
    });

    // Pedido 2: Enviado, R$ 200,00 total, R$ 20,00 frete
    await createOrder({
      status: "shipped",
      total: 20000,
      shipping: 2000,
      discount: 500,
      items: [{ product_id: productB.id, quantity: 1, price: 18500 }],
    });

    // Pedido 3: Cancelado (Deve ser ignorado)
    await createOrder({
      status: "canceled",
      total: 50000,
      items: [{ product_id: productA.id, quantity: 5, price: 10000 }],
    });

    const kpis = await salesAnalytics.getKPIs({});
    expect(kpis.summary.orders_count).toBe(2);
    expect(kpis.summary.revenue_in_cents).toBe(30000); // 10000 + 20000
    expect(kpis.summary.total_shipping_in_cents).toBe(3000); // 1000 + 2000
    expect(kpis.summary.total_discount_in_cents).toBe(500);
    expect(kpis.summary.ticket_avg_in_cents).toBe(15000); // 30000 / 2
  });

  test("should filter by date range", async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Pedido Hoje (Incluído)
    await createOrder({ status: "paid", total: 1000, createdAt: today });

    // Pedido Ontem (Incluído)
    await createOrder({ status: "paid", total: 1000, createdAt: yesterday });

    // Pedido Mês Passado (Excluído)
    await createOrder({ status: "paid", total: 5000, createdAt: lastMonth });

    // Define range: Início de Ontem até Fim de Hoje
    const start = new Date(yesterday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const kpis = await salesAnalytics.getKPIs({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    expect(kpis.summary.orders_count).toBe(2);
    expect(kpis.summary.revenue_in_cents).toBe(2000);
  });

  test("should group by payment method", async () => {
    await createOrder({ status: "paid", total: 1000, paymentMethod: "pix" });
    await createOrder({ status: "paid", total: 2000, paymentMethod: "pix" });
    // Inserindo método diferente via helper (mesmo que API restrinja, o banco aceita string)
    await createOrder({
      status: "paid",
      total: 5000,
      paymentMethod: "credit_card",
    });

    const kpis = await salesAnalytics.getKPIs({});

    const pixGroup = kpis.by_payment_method.find(
      (g) => g.payment_method === "pix",
    );
    const cardGroup = kpis.by_payment_method.find(
      (g) => g.payment_method === "credit_card",
    );

    expect(pixGroup.count).toBe(2);
    expect(pixGroup.total).toBe(3000);
    expect(cardGroup.count).toBe(1);
    expect(cardGroup.total).toBe(5000);
  });

  test("should group by product category", async () => {
    // Pedido com Produto A (Category 1)
    await createOrder({
      status: "paid",
      total: 1000,
      items: [{ product_id: productA.id, quantity: 2, price: 500 }],
    });

    // Pedido com Produto B (Category 2)
    await createOrder({
      status: "paid",
      total: 2000,
      items: [{ product_id: productB.id, quantity: 1, price: 2000 }],
    });

    const kpis = await salesAnalytics.getKPIs({});

    const cat1 = kpis.by_category.find((c) => c.category === "Category 1");
    const cat2 = kpis.by_category.find((c) => c.category === "Category 2");

    expect(cat1.revenue).toBe(1000);
    expect(cat2.revenue).toBe(2000);
  });

  test("should throw ValidationError for invalid date format", async () => {
    await expect(
      salesAnalytics.getKPIs({ startDate: "invalid-date" }),
    ).rejects.toThrow(ValidationError);
  });
});
