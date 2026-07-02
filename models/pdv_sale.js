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
import { ValidationError, NotFoundError } from "errors/index.js";

/**
 * Calcula o desconto final do carrinho, aplicando teto e piso configurados.
 * Não lança erro para desconto que ultrapassa teto/piso — apenas clampa,
 * seguindo o mesmo comportamento do motor de cupons de `models/order.js`.
 */
function calculateDiscount({
  subtotalInCents,
  totalMinimumFloorInCents,
  discountType,
  discountValue,
  settings,
}) {
  if (discountType === null || discountValue === null) {
    return 0;
  }

  if (discountType === "percentage" && discountValue > 100) {
    throw new ValidationError({
      message: "O desconto percentual não pode ser maior que 100%.",
    });
  }

  const grossDiscount =
    discountType === "percentage"
      ? Math.round(subtotalInCents * (discountValue / 100))
      : discountValue;

  // O teto pode ser configurado por valor bruto e/ou por percentual do
  // subtotal ao mesmo tempo — prevalece o que resultar no MENOR desconto.
  const caps = [grossDiscount];
  if (settings.max_discount_in_cents != null) {
    caps.push(settings.max_discount_in_cents);
  }
  if (settings.max_discount_percentage != null) {
    caps.push(Math.round(subtotalInCents * (settings.max_discount_percentage / 100)));
  }
  const cappedDiscount = Math.min(...caps);

  const floor = Math.max(
    totalMinimumFloorInCents,
    settings.min_cart_value_in_cents,
  );
  const maxAllowedDiscount = Math.max(0, subtotalInCents - floor);

  return Math.min(cappedDiscount, maxAllowedDiscount);
}

/**
 * Cria uma venda: valida itens/estoque, calcula desconto, dá baixa atômica
 * no estoque e persiste a venda + itens numa única transação.
 */
async function create({
  sellerId,
  items,
  discountType,
  discountValue,
  paymentMethodId,
  paymentMethodVariantId,
  cashGivenInCents,
  notes,
}) {
  const cleanValues = validator(
    {
      user_id: sellerId,
      pdv_sale_items: items,
      discount_type: discountType,
      pdv_discount_value: discountValue,
      pdv_payment_method_id: paymentMethodId,
      pdv_payment_method_variant_id: paymentMethodVariantId,
      cash_given_in_cents: cashGivenInCents,
      notes,
    },
    {
      user_id: "required",
      pdv_sale_items: "required",
      discount_type: "optional",
      pdv_discount_value: "optional",
      pdv_payment_method_id: "required",
      pdv_payment_method_variant_id: "optional",
      cash_given_in_cents: "optional",
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

  const paymentMethod = await pdvPaymentMethod.findById(
    cleanValues.pdv_payment_method_id,
  );
  if (!paymentMethod.is_active) {
    throw new ValidationError({
      message: "Esta forma de pagamento está inativa.",
    });
  }

  const hasActiveVariants = paymentMethod.variants.some((v) => v.is_active);

  let variant = null;
  if (cleanValues.pdv_payment_method_variant_id) {
    variant = await pdvPaymentMethod.findVariantById(
      cleanValues.pdv_payment_method_variant_id,
    );
    if (variant.payment_method_id !== paymentMethod.id || !variant.is_active) {
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

    const discountInCents = calculateDiscount({
      subtotalInCents: subtotal,
      totalMinimumFloorInCents: totalMinimumFloor,
      discountType: cleanDiscountType,
      discountValue: cleanDiscountValue,
      settings,
    });

    const totalInCents = subtotal - discountInCents;

    let changeInCents = null;
    const cashGiven = cleanValues.cash_given_in_cents ?? null;
    if (cashGiven !== null) {
      if (cashGiven < totalInCents) {
        throw new ValidationError({
          message:
            "O valor recebido em dinheiro é insuficiente para cobrir o total da venda.",
        });
      }
      changeInCents = cashGiven - totalInCents;
    }

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
          discount_in_cents, total_in_cents,
          payment_method_id, payment_method_name_snapshot,
          payment_method_variant_id, payment_method_variant_name_snapshot,
          cash_given_in_cents, change_in_cents, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `,
      values: [
        cleanValues.user_id,
        subtotal,
        cleanDiscountType,
        cleanDiscountValue,
        discountInCents,
        totalInCents,
        paymentMethod.id,
        paymentMethod.name,
        variant?.id || null,
        variant?.name || null,
        cashGiven,
        changeInCents,
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

    await client.query("COMMIT");
    return { ...createdSale, items: itemsToInsert };
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

  return { ...saleResult.rows[0], items: itemsResult.rows };
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
    whereClause += ` AND seller_id = $${paramIndex}`;
    values.push(validated.user_id);
    paramIndex++;
  }

  const result = await database.query({
    text: `
      SELECT *, count(*) OVER() as total_count
      FROM pdv_sales
      ${whereClause}
      ORDER BY created_at DESC
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
