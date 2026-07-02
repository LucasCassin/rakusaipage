import pdvSalesReport from "models/pdv_sales_report.js";
import pdvSale from "models/pdv_sale.js";
import pdvProduct from "models/pdv_product.js";
import pdvPaymentMethod from "models/pdv_payment_method.js";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";

let sellerA;
let sellerB;
let cash;
let card;
let cardVariant;
let productX;
let productY;

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
  await pdvSale.create({
    sellerId: sellerA.id,
    items: [{ product_id: productX.id, quantity: 2 }],
    paymentMethodId: cash.id,
  });

  // Venda B: sellerB, cartão + variante, produto Y
  await pdvSale.create({
    sellerId: sellerB.id,
    items: [{ product_id: productY.id, quantity: 1 }],
    paymentMethodId: card.id,
    paymentMethodVariantId: cardVariant.id,
  });

  // Venda C: sellerA, dinheiro, produtos X e Y — será cancelada
  const saleToCancel = await pdvSale.create({
    sellerId: sellerA.id,
    items: [
      { product_id: productX.id, quantity: 1 },
      { product_id: productY.id, quantity: 1 },
    ],
    paymentMethodId: cash.id,
  });
  await pdvSale.cancel(saleToCancel.id, sellerA.id, "Teste de relatório");
});

describe("Model: PdvSalesReport", () => {
  test("should filter by a single product", async () => {
    const report = await pdvSalesReport.getReport({
      productIds: [productX.id],
    });
    // Apenas a Venda A contém X e não está cancelada
    expect(report.summary.sales_count).toBe(1);
  });

  test("should filter by multiple products", async () => {
    const report = await pdvSalesReport.getReport({
      productIds: [productX.id, productY.id],
    });
    // Venda A (X) e Venda B (Y), Venda C está cancelada e fora por padrão
    expect(report.summary.sales_count).toBe(2);
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
    expect(reportPast.summary.sales_count).toBeGreaterThanOrEqual(2);
  });

  test("should filter by payment method", async () => {
    const report = await pdvSalesReport.getReport({
      paymentMethodId: card.id,
    });
    expect(report.summary.sales_count).toBe(1);
    expect(report.by_payment_method).toHaveLength(1);
    expect(report.by_payment_method[0].payment_method_id).toBe(card.id);
  });

  test("should filter by payment method variant", async () => {
    const report = await pdvSalesReport.getReport({
      paymentMethodVariantId: cardVariant.id,
    });
    expect(report.summary.sales_count).toBe(1);
    expect(report.by_variant).toHaveLength(1);
    expect(report.by_variant[0].payment_method_variant_id).toBe(cardVariant.id);
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
    // Venda A concluída; Venda C cancelada não deve contar
    expect(withoutCancelled.summary.sales_count).toBe(1);

    const withCancelled = await pdvSalesReport.getReport({
      sellerId: sellerA.id,
      includeCancelled: true,
    });
    expect(withCancelled.summary.sales_count).toBe(2);
  });
});
