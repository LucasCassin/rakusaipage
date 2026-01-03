import database from "infra/database.js";
import validator from "models/validator.js";

// Status que consideramos como "Venda Realizada" (Dinheiro garantido)
const VALID_SALES_STATUS = [
  "paid",
  "preparing",
  "shipped",
  "ready_for_pickup",
  "picked_up",
  "delivered",
];

async function getKPIs({ startDate, endDate }) {
  // Validação: Mapeamos para 'date' pois 'startDate'/'endDate' não existem no validator.js
  let cleanStart, cleanEnd;
  if (startDate) {
    cleanStart = validator({ date: startDate }, { date: "optional" }).date;
  }
  if (endDate) {
    cleanEnd = validator({ date: endDate }, { date: "optional" }).date;
  }
  // Helper para construir cláusulas WHERE dinâmicas com alias opcional
  const buildConditions = (aliasPrefix = "") => {
    const conditions = [];
    const values = [];
    let idx = 1;

    // Filtro de Status (Usa ANY para array no Postgres)
    conditions.push(`${aliasPrefix}status = ANY($${idx})`);
    values.push(VALID_SALES_STATUS);
    idx++;

    if (cleanStart) {
      conditions.push(`${aliasPrefix}created_at >= $${idx}`);
      values.push(cleanStart);
      idx++;
    }

    if (cleanEnd) {
      conditions.push(`${aliasPrefix}created_at <= $${idx}`);
      values.push(cleanEnd);
      idx++;
    }

    return {
      where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
      values,
    };
  };

  // Condições para tabelas sem alias (ou alias padrão)
  const { where: whereGeneral, values: valuesGeneral } = buildConditions("");
  // Condições para tabelas com alias 'o' (orders)
  const { where: whereOrders, values: valuesOrders } = buildConditions("o.");

  // 1. KPI Geral (Receita, Qtd Pedidos, Ticket Médio)
  const generalQuery = {
    text: `
      SELECT 
        COALESCE(SUM(total_in_cents), 0)::int as total_revenue,
        COALESCE(SUM(shipping_cost_in_cents), 0)::int as total_shipping,
        COALESCE(SUM(discount_in_cents), 0)::int as total_discount,
        COUNT(*)::int as orders_count
      FROM orders
      ${whereGeneral};
    `,
    values: valuesGeneral,
  };

  // 2. Vendas por Método de Pagamento
  const paymentQuery = {
    text: `
      SELECT payment_method, COUNT(*)::int as count, SUM(total_in_cents)::int as total
      FROM orders
      ${whereGeneral}
      GROUP BY payment_method;
    `,
    values: valuesGeneral,
  };

  // 3. Vendas por Método de Envio (Logística)
  const shippingQuery = {
    text: `
      SELECT shipping_method, COUNT(*)::int as count
      FROM orders
      ${whereGeneral}
      GROUP BY shipping_method;
    `,
    values: valuesGeneral,
  };

  // 4. Vendas por Categoria de Produto
  const categoryQuery = {
    text: `
      SELECT 
        p.category, 
        COUNT(oi.id)::int as items_sold, 
        SUM(oi.total_in_cents)::int as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      ${whereOrders}
      GROUP BY p.category
      ORDER BY revenue DESC;
    `,
    values: valuesOrders,
  };

  // Executa tudo em paralelo para ser rápido
  const client = await database.getNewClient();

  try {
    const [generalRes, paymentRes, shippingRes, categoryRes] =
      await Promise.all([
        client.query(generalQuery),
        client.query(paymentQuery),
        client.query(shippingQuery),
        client.query(categoryQuery),
      ]);

    const general = generalRes.rows[0];

    return {
      period: {
        start: cleanStart || "all",
        end: cleanEnd || "now",
      },
      summary: {
        revenue_in_cents: general.total_revenue,
        orders_count: general.orders_count,
        total_shipping_in_cents: general.total_shipping,
        total_discount_in_cents: general.total_discount,
        ticket_avg_in_cents:
          general.orders_count > 0
            ? Math.round(general.total_revenue / general.orders_count)
            : 0,
      },
      by_payment_method: paymentRes.rows,
      by_shipping_method: shippingRes.rows,
      by_category: categoryRes.rows,
    };
  } catch (error) {
    if (!error.code) {
      throw error;
    }
    throw database.handleDatabaseError(error);
  } finally {
    await client.end();
  }
}

export default {
  getKPIs,
};
