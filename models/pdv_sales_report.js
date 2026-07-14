/**
 * Este model gera o relatório agregado de vendas do PDV, filtrável por
 * produto(s), intervalo de data/hora, forma de pagamento, variante e vendedor.
 */

import database from "infra/database.js";
import validator from "models/validator.js";

async function getReport({
  productIds,
  startDate,
  endDate,
  paymentMethodIds,
  paymentMethodVariantId,
  sellerId,
  includeCancelled = false,
  includeItems = false,
  limit = 20,
  offset = 0,
} = {}) {
  let cleanStart, cleanEnd;
  if (startDate) {
    cleanStart = validator({ date: startDate }, { date: "optional" }).date;
  }
  if (endDate) {
    cleanEnd = validator({ date: endDate }, { date: "optional" }).date;
  }

  const cleanFilters = validator(
    {
      product_ids: productIds,
      pdv_payment_method_ids: paymentMethodIds,
      pdv_payment_method_variant_id: paymentMethodVariantId,
      user_id: sellerId,
      limit,
      offset,
    },
    {
      product_ids: "optional",
      pdv_payment_method_ids: "optional",
      pdv_payment_method_variant_id: "optional",
      user_id: "optional",
      limit: "required",
      offset: "required",
    },
  );

  // Cláusula WHERE dinâmica, compartilhada entre todas as agregações.
  const conditions = [];
  const values = [];
  let idx = 1;

  if (!includeCancelled) {
    conditions.push(`s.status = $${idx}`);
    values.push("completed");
    idx++;
  }

  if (cleanStart) {
    conditions.push(`s.created_at >= $${idx}`);
    values.push(cleanStart);
    idx++;
  }

  if (cleanEnd) {
    conditions.push(`s.created_at <= $${idx}`);
    values.push(cleanEnd);
    idx++;
  }

  // Uma venda pode ser paga em mais de uma forma de pagamento, então o
  // filtro por forma/variante verifica se ALGUMA das parcelas da venda bate.
  if (
    cleanFilters.pdv_payment_method_ids &&
    cleanFilters.pdv_payment_method_ids.length > 0
  ) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM pdv_sale_payments sp
        WHERE sp.sale_id = s.id AND sp.payment_method_id = ANY($${idx}::uuid[])
      )
    `);
    values.push(cleanFilters.pdv_payment_method_ids);
    idx++;
  }

  if (cleanFilters.pdv_payment_method_variant_id) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM pdv_sale_payments sp
        WHERE sp.sale_id = s.id AND sp.payment_method_variant_id = $${idx}
      )
    `);
    values.push(cleanFilters.pdv_payment_method_variant_id);
    idx++;
  }

  if (cleanFilters.user_id) {
    conditions.push(`s.seller_id = $${idx}`);
    values.push(cleanFilters.user_id);
    idx++;
  }

  if (cleanFilters.product_ids && cleanFilters.product_ids.length > 0) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM pdv_sale_items si
        WHERE si.sale_id = s.id AND si.product_id = ANY($${idx}::uuid[])
      )
    `);
    values.push(cleanFilters.product_ids);
    idx++;
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const whereWithVariant = where
    ? `${where} AND sp.payment_method_variant_id IS NOT NULL`
    : "WHERE sp.payment_method_variant_id IS NOT NULL";

  const generalQuery = {
    text: `
      SELECT
        COALESCE(SUM(s.total_in_cents), 0)::int AS revenue_in_cents,
        COALESCE(SUM(s.discount_in_cents), 0)::int AS total_discount_in_cents,
        COUNT(*)::int AS sales_count
      FROM pdv_sales s
      ${where};
    `,
    values,
  };

  const byPaymentMethodQuery = {
    text: `
      SELECT
        sp.payment_method_id,
        sp.payment_method_name_snapshot AS payment_method_name,
        COUNT(DISTINCT sp.sale_id)::int AS count,
        COALESCE(SUM(sp.amount_in_cents), 0)::int AS total_in_cents
      FROM pdv_sale_payments sp
      JOIN pdv_sales s ON s.id = sp.sale_id
      ${where}
      GROUP BY sp.payment_method_id, sp.payment_method_name_snapshot
      ORDER BY total_in_cents DESC;
    `,
    values,
  };

  const byVariantQuery = {
    text: `
      SELECT
        sp.payment_method_variant_id,
        sp.payment_method_variant_name_snapshot AS variant_name,
        sp.payment_method_id,
        sp.payment_method_name_snapshot AS payment_method_name,
        COUNT(DISTINCT sp.sale_id)::int AS count,
        COALESCE(SUM(sp.amount_in_cents), 0)::int AS total_in_cents
      FROM pdv_sale_payments sp
      JOIN pdv_sales s ON s.id = sp.sale_id
      ${whereWithVariant}
      GROUP BY
        sp.payment_method_variant_id,
        sp.payment_method_variant_name_snapshot,
        sp.payment_method_id,
        sp.payment_method_name_snapshot
      ORDER BY total_in_cents DESC;
    `,
    values,
  };

  const bySellerQuery = {
    text: `
      SELECT
        s.seller_id,
        u.username AS seller_username,
        COUNT(*)::int AS count,
        COALESCE(SUM(s.total_in_cents), 0)::int AS total_in_cents
      FROM pdv_sales s
      JOIN users u ON u.id = s.seller_id
      ${where}
      GROUP BY s.seller_id, u.username
      ORDER BY total_in_cents DESC;
    `,
    values,
  };

  const byProductQuery = {
    text: `
      SELECT
        si.product_id,
        si.product_name_snapshot AS product_name,
        COALESCE(SUM(si.quantity), 0)::int AS quantity_sold,
        COALESCE(SUM(si.total_in_cents), 0)::int AS revenue_in_cents
      FROM pdv_sale_items si
      JOIN pdv_sales s ON s.id = si.sale_id
      ${where}
      GROUP BY si.product_id, si.product_name_snapshot
      ORDER BY revenue_in_cents DESC;
    `,
    values,
  };

  // Quebra por dia (fuso de São Paulo, já que as vendas acontecem
  // presencialmente em eventos no Brasil) — usada no gráfico de KPIs por dia.
  const byDayQuery = {
    text: `
      SELECT
        TO_CHAR((s.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS sales_count,
        COALESCE(SUM(s.total_in_cents), 0)::int AS revenue_in_cents,
        COALESCE(SUM(s.discount_in_cents), 0)::int AS total_discount_in_cents
      FROM pdv_sales s
      ${where}
      GROUP BY day
      ORDER BY day;
    `,
    values,
  };

  // DISTINCT ON (day) pega só a linha de maior valor por dia — dá pra
  // responder "qual produto/forma/variante vendeu mais em cada dia" sem
  // trazer a quebra completa por dia (que o relatório já não expõe hoje).
  const byDayTopProductQuery = {
    text: `
      SELECT DISTINCT ON (day)
        day, product_id, product_name, quantity_sold, revenue_in_cents
      FROM (
        SELECT
          TO_CHAR((s.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS day,
          si.product_id,
          si.product_name_snapshot AS product_name,
          SUM(si.quantity)::int AS quantity_sold,
          SUM(si.total_in_cents)::int AS revenue_in_cents
        FROM pdv_sale_items si
        JOIN pdv_sales s ON s.id = si.sale_id
        ${where}
        GROUP BY day, si.product_id, si.product_name_snapshot
      ) t
      ORDER BY day, revenue_in_cents DESC;
    `,
    values,
  };

  const byDayTopPaymentMethodQuery = {
    text: `
      SELECT DISTINCT ON (day)
        day, payment_method_id, payment_method_name, total_in_cents
      FROM (
        SELECT
          TO_CHAR((s.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS day,
          sp.payment_method_id,
          sp.payment_method_name_snapshot AS payment_method_name,
          SUM(sp.amount_in_cents)::int AS total_in_cents
        FROM pdv_sale_payments sp
        JOIN pdv_sales s ON s.id = sp.sale_id
        ${where}
        GROUP BY day, sp.payment_method_id, sp.payment_method_name_snapshot
      ) t
      ORDER BY day, total_in_cents DESC;
    `,
    values,
  };

  const byDayTopVariantQuery = {
    text: `
      SELECT DISTINCT ON (day)
        day, payment_method_variant_id, variant_name, total_in_cents
      FROM (
        SELECT
          TO_CHAR((s.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS day,
          sp.payment_method_variant_id,
          sp.payment_method_variant_name_snapshot AS variant_name,
          SUM(sp.amount_in_cents)::int AS total_in_cents
        FROM pdv_sale_payments sp
        JOIN pdv_sales s ON s.id = sp.sale_id
        ${whereWithVariant}
        GROUP BY day, sp.payment_method_variant_id, sp.payment_method_variant_name_snapshot
      ) t
      ORDER BY day, total_in_cents DESC;
    `,
    values,
  };

  // LATERAL em vez de JOIN + GROUP BY: cada subconsulta já agrega para uma
  // única linha por venda, então dá pra somar o join de itens (usado só na
  // exportação/analítico) sem multiplicar as linhas de pagamentos.
  const salesQueryValues = [...values, cleanFilters.limit, cleanFilters.offset];
  const salesQuery = {
    text: `
      SELECT
        s.*,
        count(*) OVER() as total_count,
        COALESCE(p.payments, '[]') AS payments
        ${includeItems ? ", COALESCE(i.items, '[]') AS items" : ""}
      FROM pdv_sales s
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', sp.id,
            'payment_method_id', sp.payment_method_id,
            'payment_method_name_snapshot', sp.payment_method_name_snapshot,
            'payment_method_variant_id', sp.payment_method_variant_id,
            'payment_method_variant_name_snapshot', sp.payment_method_variant_name_snapshot,
            'amount_in_cents', sp.amount_in_cents,
            'cash_given_in_cents', sp.cash_given_in_cents,
            'change_in_cents', sp.change_in_cents
          )
        ) AS payments
        FROM pdv_sale_payments sp
        WHERE sp.sale_id = s.id
      ) p ON true
      ${
        includeItems
          ? `LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'product_id', si.product_id,
            'product_name_snapshot', si.product_name_snapshot,
            'unit_price_in_cents', si.unit_price_in_cents,
            'quantity', si.quantity,
            'total_in_cents', si.total_in_cents
          )
        ) AS items
        FROM pdv_sale_items si
        WHERE si.sale_id = s.id
      ) i ON true`
          : ""
      }
      ${where}
      ORDER BY s.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2};
    `,
    values: salesQueryValues,
  };

  const client = await database.getNewClient();

  try {
    const [
      generalResult,
      paymentMethodResult,
      variantResult,
      sellerResult,
      productResult,
      dayResult,
      dayTopProductResult,
      dayTopPaymentMethodResult,
      dayTopVariantResult,
      salesResult,
    ] = await Promise.all([
      client.query(generalQuery),
      client.query(byPaymentMethodQuery),
      client.query(byVariantQuery),
      client.query(bySellerQuery),
      client.query(byProductQuery),
      client.query(byDayQuery),
      client.query(byDayTopProductQuery),
      client.query(byDayTopPaymentMethodQuery),
      client.query(byDayTopVariantQuery),
      client.query(salesQuery),
    ]);

    const topProductByDay = Object.fromEntries(
      dayTopProductResult.rows.map((row) => [row.day, row]),
    );
    const topPaymentMethodByDay = Object.fromEntries(
      dayTopPaymentMethodResult.rows.map((row) => [row.day, row]),
    );
    const topVariantByDay = Object.fromEntries(
      dayTopVariantResult.rows.map((row) => [row.day, row]),
    );

    const general = generalResult.rows[0];

    return {
      period: {
        start: cleanStart || "all",
        end: cleanEnd || "now",
      },
      summary: {
        revenue_in_cents: general.revenue_in_cents,
        total_discount_in_cents: general.total_discount_in_cents,
        sales_count: general.sales_count,
        ticket_avg_in_cents:
          general.sales_count > 0
            ? Math.round(general.revenue_in_cents / general.sales_count)
            : 0,
      },
      by_payment_method: paymentMethodResult.rows,
      by_variant: variantResult.rows,
      by_seller: sellerResult.rows,
      by_product: productResult.rows,
      by_day: dayResult.rows.map((row) => {
        const topProduct = topProductByDay[row.day];
        const topPaymentMethod = topPaymentMethodByDay[row.day];
        const topVariant = topVariantByDay[row.day];
        return {
          ...row,
          ticket_avg_in_cents:
            row.sales_count > 0
              ? Math.round(row.revenue_in_cents / row.sales_count)
              : 0,
          top_product_name: topProduct?.product_name ?? null,
          top_product_revenue_in_cents: topProduct?.revenue_in_cents ?? null,
          top_payment_method_name:
            topPaymentMethod?.payment_method_name ?? null,
          top_payment_method_revenue_in_cents:
            topPaymentMethod?.total_in_cents ?? null,
          top_variant_name: topVariant?.variant_name ?? null,
          top_variant_revenue_in_cents: topVariant?.total_in_cents ?? null,
        };
      }),
      sales: salesResult.rows,
      count:
        salesResult.rows.length > 0
          ? parseInt(salesResult.rows[0].total_count)
          : 0,
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
  getReport,
};
