/**
 * Este model é o motor principal do PDV: cria vendas (com baixa atômica de
 * estoque), calcula o desconto do fechamento do carrinho e permite o
 * cancelamento de vendas já concluídas (com devolução de estoque).
 */

import database from "infra/database.js";
import validator from "models/validator.js";
import pdvProduct from "models/pdv_product.js";
import pdvPaymentMethod from "models/pdv_payment_method.js";
import pdvSettings from "models/pdv_settings.js";
import { calculatePdvDiscount } from "src/utils/calculatePdvDiscount.js";
import { ValidationError, NotFoundError } from "errors/index.js";

/**
 * Resolve e valida cada forma de pagamento informada (existe, está ativa,
 * variante pertence à forma e está ativa / é exigida quando há variantes
 * ativas). Não valida os valores ainda — o total da venda só é conhecido
 * depois da baixa de estoque, dentro da transação.
 */
async function resolvePaymentMethods(payments) {
  const resolved = [];

  for (const payment of payments) {
    const paymentMethod = await pdvPaymentMethod.findById(
      payment.payment_method_id,
    );
    if (!paymentMethod.is_active) {
      throw new ValidationError({
        message: `A forma de pagamento "${paymentMethod.name}" está inativa.`,
      });
    }

    const hasActiveVariants = paymentMethod.variants.some((v) => v.is_active);

    let variant = null;
    if (payment.payment_method_variant_id) {
      variant = await pdvPaymentMethod.findVariantById(
        payment.payment_method_variant_id,
      );
      if (
        variant.payment_method_id !== paymentMethod.id ||
        !variant.is_active
      ) {
        throw new ValidationError({
          message:
            "Esta variante não pertence à forma de pagamento selecionada, ou está inativa.",
        });
      }
    } else if (hasActiveVariants) {
      throw new ValidationError({
        message: `A forma de pagamento "${paymentMethod.name}" exige a escolha de uma variante (ex: qual máquina foi usada).`,
      });
    }

    resolved.push({
      payment_method_id: paymentMethod.id,
      payment_method_name_snapshot: paymentMethod.name,
      payment_method_variant_id: variant?.id || null,
      payment_method_variant_name_snapshot: variant?.name || null,
      amount_in_cents: payment.amount_in_cents,
      cash_given_in_cents: payment.cash_given_in_cents ?? null,
    });
  }

  return resolved;
}

/**
 * Confere se a soma das formas de pagamento bate com o total da venda e
 * calcula o troco de cada forma que informou valor recebido em dinheiro.
 * Uma venda pode ser dividida em mais de uma forma de pagamento (ex: metade
 * no Pix, metade em dinheiro) — cada uma cobre uma fração do total.
 */
function finalizePayments(resolvedPayments, totalInCents) {
  const sumInCents = resolvedPayments.reduce(
    (acc, payment) => acc + payment.amount_in_cents,
    0,
  );

  if (sumInCents !== totalInCents) {
    throw new ValidationError({
      message:
        "A soma dos valores das formas de pagamento não corresponde ao total da venda.",
    });
  }

  return resolvedPayments.map((payment) => {
    let changeInCents = null;
    if (payment.cash_given_in_cents !== null) {
      if (payment.cash_given_in_cents < payment.amount_in_cents) {
        throw new ValidationError({
          message: `O valor recebido em dinheiro para "${payment.payment_method_name_snapshot}" é insuficiente para cobrir o valor alocado a essa forma de pagamento.`,
        });
      }
      changeInCents = payment.cash_given_in_cents - payment.amount_in_cents;
    }
    return { ...payment, change_in_cents: changeInCents };
  });
}

/**
 * Cria uma venda: valida itens/estoque, calcula desconto, dá baixa atômica
 * no estoque e persiste a venda + itens + formas de pagamento numa única
 * transação.
 */
async function create({
  sellerId,
  items,
  discountType,
  discountValue,
  payments,
  notes,
}) {
  const cleanValues = validator(
    {
      user_id: sellerId,
      pdv_sale_items: items,
      discount_type: discountType,
      pdv_discount_value: discountValue,
      pdv_sale_payments: payments,
      notes,
    },
    {
      user_id: "required",
      pdv_sale_items: "required",
      discount_type: "optional",
      pdv_discount_value: "optional",
      pdv_sale_payments: "required",
      notes: "optional",
    },
  );

  const cleanDiscountType = cleanValues.discount_type ?? null;
  const cleanDiscountValue = cleanValues.pdv_discount_value ?? null;

  if ((cleanDiscountType === null) !== (cleanDiscountValue === null)) {
    throw new ValidationError({
      message:
        "Informe o tipo e o valor do desconto juntos, ou nenhum dos dois.",
    });
  }

  if (cleanDiscountType === "percentage" && cleanDiscountValue > 100) {
    throw new ValidationError({
      message: "O desconto percentual não pode ser maior que 100%.",
    });
  }

  const resolvedPayments = await resolvePaymentMethods(
    cleanValues.pdv_sale_payments,
  );

  const settings = await pdvSettings.get();
  const productIds = cleanValues.pdv_sale_items.map((item) => item.product_id);

  const client = await database.getNewClient();
  let createdSale = null;

  try {
    await client.query("BEGIN");

    const products = await pdvProduct.findManyByIdsForUpdate(
      productIds,
      client,
    );
    const productsById = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    let totalMinimumFloor = 0;
    const itemsToInsert = [];

    for (const item of cleanValues.pdv_sale_items) {
      const currentProduct = productsById.get(item.product_id);

      if (!currentProduct) {
        throw new NotFoundError({
          message: `Produto do PDV não encontrado: ${item.product_id}.`,
        });
      }

      if (!currentProduct.is_active) {
        throw new ValidationError({
          message: `O produto "${currentProduct.name}" não está mais disponível.`,
        });
      }

      const unitPriceInCents = currentProduct.price_in_cents;
      const lineTotalInCents = unitPriceInCents * item.quantity;

      subtotal += lineTotalInCents;
      totalMinimumFloor +=
        (currentProduct.min_unit_price_in_cents || 0) * item.quantity;

      itemsToInsert.push({
        product_id: currentProduct.id,
        product_name_snapshot: currentProduct.name,
        unit_price_in_cents: unitPriceInCents,
        quantity: item.quantity,
        total_in_cents: lineTotalInCents,
      });
    }

    const { discountInCents, cappedBy: discountCappedBy } =
      calculatePdvDiscount({
        subtotalInCents: subtotal,
        totalMinimumFloorInCents: totalMinimumFloor,
        discountType: cleanDiscountType,
        discountValue: cleanDiscountValue,
        settings,
      });

    const totalInCents = subtotal - discountInCents;

    const finalizedPayments = finalizePayments(resolvedPayments, totalInCents);

    // Baixa atômica de estoque, dentro da mesma transação. Se qualquer item
    // falhar, o erro propaga e o ROLLBACK desfaz tudo (nenhuma baixa parcial).
    await pdvProduct.decrementForSale(
      itemsToInsert.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      client,
    );

    const saleResult = await client.query({
      text: `
        INSERT INTO pdv_sales (
          seller_id, subtotal_in_cents, discount_type, discount_value,
          discount_in_cents, total_in_cents, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `,
      values: [
        cleanValues.user_id,
        subtotal,
        cleanDiscountType,
        cleanDiscountValue,
        discountInCents,
        totalInCents,
        cleanValues.notes || null,
      ],
    });
    createdSale = saleResult.rows[0];

    for (const item of itemsToInsert) {
      await client.query({
        text: `
          INSERT INTO pdv_sale_items (
            sale_id, product_id, product_name_snapshot,
            unit_price_in_cents, quantity, total_in_cents
          ) VALUES ($1, $2, $3, $4, $5, $6);
        `,
        values: [
          createdSale.id,
          item.product_id,
          item.product_name_snapshot,
          item.unit_price_in_cents,
          item.quantity,
          item.total_in_cents,
        ],
      });
    }

    const paymentsToInsert = [];
    for (const payment of finalizedPayments) {
      const paymentResult = await client.query({
        text: `
          INSERT INTO pdv_sale_payments (
            sale_id, payment_method_id, payment_method_name_snapshot,
            payment_method_variant_id, payment_method_variant_name_snapshot,
            amount_in_cents, cash_given_in_cents, change_in_cents
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `,
        values: [
          createdSale.id,
          payment.payment_method_id,
          payment.payment_method_name_snapshot,
          payment.payment_method_variant_id,
          payment.payment_method_variant_name_snapshot,
          payment.amount_in_cents,
          payment.cash_given_in_cents,
          payment.change_in_cents,
        ],
      });
      paymentsToInsert.push(paymentResult.rows[0]);
    }

    await client.query("COMMIT");
    return {
      ...createdSale,
      discount_capped_by: discountCappedBy,
      items: itemsToInsert,
      payments: paymentsToInsert,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    }
    throw database.handleDatabaseError(error);
  } finally {
    await client.end();
  }
}

/**
 * Busca uma venda pelo ID, com seus itens.
 */
async function findById(id) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const saleResult = await database.query({
    text: "SELECT * FROM pdv_sales WHERE id = $1;",
    values: [cleanId],
  });

  if (saleResult.rowCount === 0) {
    throw new NotFoundError({
      message: "Venda não encontrada.",
    });
  }

  const itemsResult = await database.query({
    text: "SELECT * FROM pdv_sale_items WHERE sale_id = $1 ORDER BY created_at ASC;",
    values: [cleanId],
  });

  const paymentsResult = await database.query({
    text: "SELECT * FROM pdv_sale_payments WHERE sale_id = $1 ORDER BY created_at ASC;",
    values: [cleanId],
  });

  return {
    ...saleResult.rows[0],
    items: itemsResult.rows,
    payments: paymentsResult.rows,
  };
}

/**
 * Lista vendas com paginação, opcionalmente filtrando por vendedor.
 */
async function findAll({ limit = 20, offset = 0, sellerId } = {}) {
  const validated = validator(
    { limit, offset, user_id: sellerId },
    { limit: "required", offset: "required", user_id: "optional" },
  );

  const values = [validated.limit, validated.offset];
  let whereClause = "WHERE 1=1";
  let paramIndex = 3;

  if (validated.user_id) {
    whereClause += ` AND s.seller_id = $${paramIndex}`;
    values.push(validated.user_id);
    paramIndex++;
  }

  const result = await database.query({
    text: `
      SELECT
        s.*,
        count(*) OVER() as total_count,
        COALESCE(
          json_agg(
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
          ) FILTER (WHERE sp.id IS NOT NULL),
          '[]'
        ) AS payments
      FROM pdv_sales s
      LEFT JOIN pdv_sale_payments sp ON sp.sale_id = s.id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2;
    `,
    values,
  });

  return {
    sales: result.rows,
    count: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
  };
}

/**
 * Cancela uma venda concluída, devolvendo os itens ao estoque.
 */
async function cancel(saleId, cancelledByUserId, reason) {
  const cleanValues = validator(
    { id: saleId, user_id: cancelledByUserId, cancel_reason: reason },
    { id: "required", user_id: "required", cancel_reason: "optional" },
  );

  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    const saleCheck = await client.query({
      text: "SELECT status FROM pdv_sales WHERE id = $1 FOR UPDATE;",
      values: [cleanValues.id],
    });

    if (saleCheck.rowCount === 0) {
      throw new NotFoundError({
        message: "Venda não encontrada.",
      });
    }

    if (saleCheck.rows[0].status === "cancelled") {
      throw new ValidationError({
        message: "Esta venda já está cancelada.",
      });
    }

    const itemsRes = await client.query({
      text: "SELECT product_id, quantity FROM pdv_sale_items WHERE sale_id = $1;",
      values: [cleanValues.id],
    });

    await pdvProduct.restockForCancel(itemsRes.rows, client);

    const updateRes = await client.query({
      text: `
        UPDATE pdv_sales
        SET status = 'cancelled',
            cancelled_at = (now() at time zone 'utc'),
            cancelled_by = $2,
            cancel_reason = $3
        WHERE id = $1
        RETURNING *;
      `,
      values: [
        cleanValues.id,
        cleanValues.user_id,
        cleanValues.cancel_reason || null,
      ],
    });

    await client.query("COMMIT");
    return updateRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    }
    throw database.handleDatabaseError(error);
  } finally {
    await client.end();
  }
}

export default {
  create,
  findById,
  findAll,
  cancel,
};
