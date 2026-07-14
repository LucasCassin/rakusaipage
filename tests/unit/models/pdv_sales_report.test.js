import pdvSalesReport from "models/pdv_sales_report.js";
import pdvSale from "models/pdv_sale.js";
import pdvProduct from "models/pdv_product.js";
import pdvPaymentMethod from "models/pdv_payment_method.js";
import user from "models/user.js";
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

let sellerA;
let sellerB;
let cash;
let card;
let cardVariant;
let productX;
let productY;
let saleA;
let saleD;

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();

  sellerA = await user.create({
    username: "reportSellerA",
    email: "report-seller-a@test.com",
    password: "StrongPassword123@",
  });
  sellerB = await user.create({
    username: "reportSellerB",
    email: "report-seller-b@test.com",
    password: "StrongPassword123@",
  });

  cash = await pdvPaymentMethod.create({ name: "Dinheiro Relatório" });
  card = await pdvPaymentMethod.create({ name: "Cartão Relatório" });
  cardVariant = await pdvPaymentMethod.createVariant(card.id, {
    name: "Máquina Relatório",
  });

  productX = await pdvProduct.create({
    name: "Produto Relatório X",
    price_in_cents: 1000,
    stock_quantity: 1000,
  });
  productY = await pdvProduct.create({
    name: "Produto Relatório Y",
    price_in_cents: 2000,
    stock_quantity: 1000,
  });

  // Venda A: sellerA, dinheiro, produto X
  saleA = await pdvSale.create({
    sellerId: sellerA.id,
    items: [{ product_id: productX.id, quantity: 2 }],
    payments: [{ payment_method_id: cash.id, amount_in_cents: 2000 }],
  });

  // Venda B: sellerB, cartão + variante, produto Y
  await pdvSale.create({
    sellerId: sellerB.id,
    items: [{ product_id: productY.id, quantity: 1 }],
    payments: [
      {
        payment_method_id: card.id,
        payment_method_variant_id: cardVariant.id,
        amount_in_cents: 2000,
      },
    ],
  });

  // Venda C: sellerA, dinheiro, produtos X e Y — será cancelada
  const saleToCancel = await pdvSale.create({
    sellerId: sellerA.id,
    items: [
      { product_id: productX.id, quantity: 1 },
      { product_id: productY.id, quantity: 1 },
    ],
    payments: [{ payment_method_id: cash.id, amount_in_cents: 3000 }],
  });
  await pdvSale.cancel(saleToCancel.id, sellerA.id, "Teste de relatório");

  // Venda D: sellerA, dividida entre dinheiro e cartão+variante, produto X
  saleD = await pdvSale.create({
    sellerId: sellerA.id,
    items: [{ product_id: productX.id, quantity: 3 }],
    payments: [
      { payment_method_id: cash.id, amount_in_cents: 1000 },
      {
        payment_method_id: card.id,
        payment_method_variant_id: cardVariant.id,
        amount_in_cents: 2000,
      },
    ],
  });
});

describe("Model: PdvSalesReport", () => {
  test("should filter by a single product", async () => {
    const report = await pdvSalesReport.getReport({
      productIds: [productX.id],
    });
    // Venda A e Venda D contêm X e não estão canceladas
    expect(report.summary.sales_count).toBe(2);
  });

  test("should filter by multiple products", async () => {
    const report = await pdvSalesReport.getReport({
      productIds: [productX.id, productY.id],
    });
    // Venda A (X), Venda B (Y) e Venda D (X); Venda C está cancelada e fora por padrão
    expect(report.summary.sales_count).toBe(3);
  });

  test("should filter by date range", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const reportFuture = await pdvSalesReport.getReport({
      startDate: future,
    });
    expect(reportFuture.summary.sales_count).toBe(0);

    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const reportPast = await pdvSalesReport.getReport({
      startDate: past,
    });
    expect(reportPast.summary.sales_count).toBeGreaterThanOrEqual(3);
  });

  test("should filter by payment method, matching any sale that used it in a split payment", async () => {
    const report = await pdvSalesReport.getReport({
      paymentMethodIds: [card.id],
    });
    // Venda B (só cartão) e Venda D (dividida, cartão é uma das pernas)
    expect(report.summary.sales_count).toBe(2);

    // O breakdown reflete TODAS as pernas das vendas que casaram com o
    // filtro — como a Venda D também tem uma perna em dinheiro, ela aparece
    // aqui também, mesmo o filtro sendo por cartão.
    const cardRow = report.by_payment_method.find(
      (row) => row.payment_method_id === card.id,
    );
    const cashRow = report.by_payment_method.find(
      (row) => row.payment_method_id === cash.id,
    );
    // 2000 (Venda B) + 2000 (perna do cartão na Venda D)
    expect(cardRow.total_in_cents).toBe(4000);
    expect(cardRow.count).toBe(2);
    // Apenas a perna de dinheiro da Venda D
    expect(cashRow.total_in_cents).toBe(1000);
    expect(cashRow.count).toBe(1);
  });

  test("should filter by multiple payment methods at once", async () => {
    const report = await pdvSalesReport.getReport({
      paymentMethodIds: [cash.id, card.id],
    });
    // Todas as vendas não canceladas usam dinheiro e/ou cartão: A, B e D
    expect(report.summary.sales_count).toBe(3);
  });

  test("should filter by payment method variant", async () => {
    const report = await pdvSalesReport.getReport({
      paymentMethodVariantId: cardVariant.id,
    });
    expect(report.summary.sales_count).toBe(2);
    expect(report.by_variant).toHaveLength(1);
    expect(report.by_variant[0].payment_method_variant_id).toBe(cardVariant.id);
    expect(report.by_variant[0].total_in_cents).toBe(4000);
  });

  test("should aggregate by_payment_method across split payments without filters", async () => {
    const report = await pdvSalesReport.getReport({ sellerId: sellerA.id });

    const cashRow = report.by_payment_method.find(
      (row) => row.payment_method_id === cash.id,
    );
    const cardRow = report.by_payment_method.find(
      (row) => row.payment_method_id === card.id,
    );

    // Venda A (2000 em dinheiro) + perna de dinheiro da Venda D (1000)
    expect(cashRow.total_in_cents).toBe(3000);
    // Apenas a perna de cartão da Venda D (2000) — Venda B é do sellerB
    expect(cardRow.total_in_cents).toBe(2000);
  });

  test("should filter by seller", async () => {
    const report = await pdvSalesReport.getReport({ sellerId: sellerB.id });
    expect(report.summary.sales_count).toBe(1);
    expect(report.by_seller).toHaveLength(1);
    expect(report.by_seller[0].seller_id).toBe(sellerB.id);
  });

  test("should exclude cancelled sales by default and include them when requested", async () => {
    const withoutCancelled = await pdvSalesReport.getReport({
      sellerId: sellerA.id,
    });
    // Venda A e Venda D concluídas; Venda C cancelada não deve contar
    expect(withoutCancelled.summary.sales_count).toBe(2);

    const withCancelled = await pdvSalesReport.getReport({
      sellerId: sellerA.id,
      includeCancelled: true,
    });
    expect(withCancelled.summary.sales_count).toBe(3);
  });

  test("should list each sale's payments in the sales listing", async () => {
    const report = await pdvSalesReport.getReport({ sellerId: sellerA.id });
    const splitSale = report.sales.find((sale) => sale.payments.length === 2);
    expect(splitSale).toBeDefined();
    const total = splitSale.payments.reduce(
      (acc, p) => acc + p.amount_in_cents,
      0,
    );
    expect(total).toBe(splitSale.total_in_cents);
  });

  test("should not include items in the sales listing by default", async () => {
    const report = await pdvSalesReport.getReport({ sellerId: sellerA.id });
    expect(report.sales[0].items).toBeUndefined();
  });

  test("should include each sale's items when includeItems is requested", async () => {
    const report = await pdvSalesReport.getReport({
      sellerId: sellerA.id,
      includeItems: true,
    });
    const splitSale = report.sales.find((sale) => sale.id === saleD.id);
    expect(splitSale.items).toHaveLength(1);
    expect(splitSale.items[0]).toMatchObject({
      product_id: productX.id,
      product_name_snapshot: "Produto Relatório X",
      quantity: 3,
    });
  });

  test("should aggregate by_day using the sale's calendar day", async () => {
    // Move a Venda A para "ontem" (fuso de São Paulo) para garantir que o
    // relatório enxergue pelo menos dois dias distintos.
    const yesterdaySaoPaulo = await database.query({
      text: `
        SELECT
          TO_CHAR(
            ((now() AT TIME ZONE 'America/Sao_Paulo') - interval '1 day')::date,
            'YYYY-MM-DD'
          ) AS day;
      `,
    });
    const targetDay = yesterdaySaoPaulo.rows[0].day;

    await database.query({
      text: `
        UPDATE pdv_sales
        SET created_at = ($1 || ' 12:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo'
        WHERE id = $2;
      `,
      values: [targetDay, saleA.id],
    });

    try {
      const report = await pdvSalesReport.getReport({ sellerId: sellerA.id });
      const dayRow = report.by_day.find((row) => row.day === targetDay);

      expect(dayRow).toBeDefined();
      expect(dayRow.sales_count).toBe(1);
      expect(dayRow.revenue_in_cents).toBe(saleA.total_in_cents);
      expect(report.by_day.every((row) => row.sales_count > 0)).toBe(true);
      // Venda A (movida) + Venda D continuam somando o total de sellerA.
      expect(report.by_day.reduce((acc, row) => acc + row.sales_count, 0)).toBe(
        report.summary.sales_count,
      );

      // No dia da Venda A: só produto X pago em dinheiro, sem variante.
      expect(dayRow.top_product_name).toBe("Produto Relatório X");
      expect(dayRow.top_payment_method_name).toBe("Dinheiro Relatório");
      expect(dayRow.top_variant_name).toBeNull();

      // No dia da Venda D (dividida): a perna de cartão+variante (2000) supera
      // a de dinheiro (1000), então ela é o "top" da forma/variante do dia.
      const todayRow = report.by_day.find((row) => row.day !== targetDay);
      expect(todayRow.top_product_name).toBe("Produto Relatório X");
      expect(todayRow.top_payment_method_name).toBe("Cartão Relatório");
      expect(todayRow.top_payment_method_revenue_in_cents).toBe(2000);
      expect(todayRow.top_variant_name).toBe("Máquina Relatório");
      expect(todayRow.top_variant_revenue_in_cents).toBe(2000);
    } finally {
      // Restaura para não afetar os outros testes deste arquivo.
      await database.query({
        text: `UPDATE pdv_sales SET created_at = timezone('utc', now()) WHERE id = $1;`,
        values: [saleA.id],
      });
    }
  });
});
