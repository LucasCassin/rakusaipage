import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";
import session from "models/session.js";
import product from "models/product.js";
import database from "infra/database.js";

describe("GET /api/v1/sales_kpi", () => {
  let adminUser, adminSession;
  let regularUser, regularSession;
  let productA, productB;

  beforeAll(async () => {
    await orchestrator.waitForAllServices();
    await orchestrator.clearDatabase();
    await orchestrator.runPendingMigrations();

    // 1. Criar Admin (com permissão)
    adminUser = await user.findOneUser({ username: "mainUser" });
    // Atualizar senha (padrão dos testes)
    adminUser = await user.update({
      id: adminUser.id,
      password: "StrongPassword123@",
    });
    // Adicionar feature necessária
    adminUser = await user.addFeatures(adminUser, ["shop:orders:read_all"]);
    adminSession = await session.create(adminUser);

    // 2. Criar Usuário Comum (sem permissão)
    regularUser = await user.create({
      username: "regularKPI",
      email: "regular_kpi@test.com",
      password: "StrongPassword123@",
    });
    regularUser = await user.update({
      id: regularUser.id,
      password: "StrongPassword123@",
    });
    regularSession = await session.create(regularUser);

    // 3. Criar Produtos para os pedidos
    productA = await product.create({
      name: "Produto A",
      slug: "prod-a",
      description: "Desc A",
      category: "Categoria 1",
      price_in_cents: 1000,
      minimum_price_in_cents: 500,
      stock_quantity: 100,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
    });

    productB = await product.create({
      name: "Produto B",
      slug: "prod-b",
      description: "Desc B",
      category: "Categoria 2",
      price_in_cents: 2000,
      minimum_price_in_cents: 1000,
      stock_quantity: 100,
      weight_in_grams: 100,
      length_cm: 10,
      height_cm: 10,
      width_cm: 10,
    });
  });

  // Helper para criar pedidos no banco
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
          adminUser.id, // User ID qualquer
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

  describe("Authentication & Authorization", () => {
    test("should return 403 if user is anonymous", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sales_kpi`,
      );
      expect(response.status).toBe(403);
    });

    test("should return 403 if user does not have 'shop:orders:read_all' feature", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sales_kpi`,
        {
          headers: {
            cookie: `session_id=${regularSession.token}`,
          },
        },
      );
      expect(response.status).toBe(403);
    });
  });

  describe("Happy Path", () => {
    test("should return empty KPIs if no orders exist", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sales_kpi`,
        {
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.summary.orders_count).toBe(0);
      expect(body.summary.revenue_in_cents).toBe(0);
    });

    test("should return aggregated KPIs for valid orders", async () => {
      // Pedido 1: Pago, R$ 100,00
      await createOrder({
        status: "paid",
        total: 10000,
        shipping: 1000,
        items: [{ product_id: productA.id, quantity: 1, price: 9000 }],
      });

      // Pedido 2: Enviado, R$ 200,00
      await createOrder({
        status: "shipped",
        total: 20000,
        shipping: 2000,
        discount: 500,
        items: [{ product_id: productB.id, quantity: 1, price: 18500 }],
      });

      // Pedido 3: Cancelado (Ignorado)
      await createOrder({
        status: "canceled",
        total: 50000,
        items: [{ product_id: productA.id, quantity: 5, price: 10000 }],
      });

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sales_kpi`,
        {
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.summary.orders_count).toBe(2);
      expect(body.summary.revenue_in_cents).toBe(30000); // 10000 + 20000
      expect(body.summary.total_shipping_in_cents).toBe(3000); // 1000 + 2000
      expect(body.summary.total_discount_in_cents).toBe(500);
      expect(body.by_category).toHaveLength(2);
    });

    test("should filter KPIs by date range", async () => {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Pedido Hoje
      await createOrder({
        status: "paid",
        total: 1000,
        createdAt: today,
      });

      // Pedido Mês Passado
      await createOrder({
        status: "paid",
        total: 5000,
        createdAt: lastMonth,
      });

      // Filtra apenas hoje
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      });

      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sales_kpi?${params}`,
        {
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.summary.orders_count).toBe(1);
      expect(body.summary.revenue_in_cents).toBe(1000);
    });
  });

  describe("Error Handling", () => {
    test("should return 400 if date format is invalid", async () => {
      const response = await fetch(
        `${orchestrator.webserverUrl}/api/v1/sales_kpi?start_date=invalid-date`,
        {
          headers: {
            cookie: `session_id=${adminSession.token}`,
          },
        },
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
    });
  });
});
