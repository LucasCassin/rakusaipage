import database from "infra/database.js";
import cart from "models/cart.js";
import coupon from "models/coupon.js";
import validator from "models/validator.js";
import { ValidationError, NotFoundError, ServiceError } from "errors/index.js";

async function createFromCart({
  userId,
  paymentMethod,
  shippingAddress,
  shippingCostInCents,
  couponCodes,
  shippingMethod, // "PAC", "SEDEX", "PICKUP"
  shippingDetails,
}) {
  const cleanValues = validator(
    {
      user_id: userId,
      payment_method: paymentMethod,
      shipping_address_snapshot: shippingAddress,
      shipping_cost_in_cents: shippingCostInCents,
      coupon_codes: couponCodes,
      shipping_method: shippingMethod,
      shipping_details: shippingDetails,
    },
    {
      user_id: "required",
      payment_method: "required",
      shipping_address_snapshot: "required",
      shipping_cost_in_cents: "required",
      coupon_codes: "optional",
      shipping_method: "required",
      shipping_details: "optional",
    },
  );

  const client = await database.getNewClient();
  let createdOrder = null;

  try {
    await client.query("BEGIN");

    const userCart = await cart.getCart(cleanValues.user_id, client);

    if (userCart.items.length === 0) {
      throw new ValidationError({
        message: "O carrinho está vazio.",
      });
    }

    let subtotal = 0;
    let totalMinimumFloor = 0; // Soma dos preços mínimos
    const itemsToInsert = [];

    for (const item of userCart.items) {
      // 1. Validação de Disponibilidade (Ativo)
      if (!item.is_active) {
        // Nota: Em uma transação que falha (Rollback), não conseguimos persistir a remoção do item.
        // O comportamento correto é impedir a compra e avisar o usuário para ele remover.
        throw new ValidationError({
          message: `O produto "${item.name}" não está mais disponível. Remova-o do carrinho para continuar.`,
        });
      }

      // 2. Validação de Estoque
      if (item.stock_quantity < item.quantity) {
        throw new ValidationError({
          message: `Estoque insuficiente para o produto "${item.name}". Restam apenas ${item.stock_quantity} unidades.`,
        });
      }

      const totalItem = item.unit_price_in_cents * item.quantity;
      const totalItemMinimum =
        (item.minimum_price_in_cents || 0) * item.quantity;

      subtotal += totalItem;
      totalMinimumFloor += totalItemMinimum;

      itemsToInsert.push({
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price_in_cents,
        total: totalItem,
      });

      // 3. ATUALIZAÇÃO DE ESTOQUE (Reserva)
      await client.query({
        text: `
          UPDATE products 
          SET stock_quantity = stock_quantity - $1 
          WHERE id = $2
        `,
        values: [item.quantity, item.product_id],
      });
    }

    // 4. Aplicação de Cupom
    let finalDiscount = 0;
    let appliedCouponsList = []; // Array para salvar no banco

    if (cleanValues.coupon_codes && cleanValues.coupon_codes.length > 0) {
      // 1. Valida todos os cupons enviados
      const validCoupons = await coupon.validateMultiple(
        cleanValues.coupon_codes,
        userId,
        subtotal,
      );

      // Função auxiliar para calcular desconto de UM cupom isolado
      const calculateSingleDiscount = (coupon) => {
        let val = 0;
        if (coupon.type === "shipping") {
          val = Math.round(
            shippingCostInCents * (coupon.discount_percentage / 100),
          );
          if (
            coupon.max_discount_in_cents &&
            val > coupon.max_discount_in_cents
          ) {
            val = coupon.max_discount_in_cents;
          }
          if (val > shippingCostInCents) val = shippingCostInCents;
        } else {
          val = Math.round(subtotal * (coupon.discount_percentage / 100));
          if (
            coupon.max_discount_in_cents &&
            val > coupon.max_discount_in_cents
          ) {
            val = coupon.max_discount_in_cents;
          }
        }
        return val;
      };

      // CENÁRIO A: Soma dos Cumulativos
      const cumulativeCoupons = validCoupons.filter((c) => c.is_cumulative);
      let cumulativeTotalDiscount = 0;
      let cumulativeAppliedSnapshots = [];

      for (const c of cumulativeCoupons) {
        const disc = calculateSingleDiscount(c);
        cumulativeTotalDiscount += disc;
        cumulativeAppliedSnapshots.push({
          id: c.id,
          code: c.code,
          discount_in_cents: disc,
          type: c.type,
        });
      }

      // CENÁRIO B: O Melhor Não-Cumulativo
      const singleCoupons = validCoupons.filter((c) => !c.is_cumulative);
      let bestSingleDiscount = 0;
      let bestSingleSnapshot = [];

      for (const c of singleCoupons) {
        const disc = calculateSingleDiscount(c);
        if (disc > bestSingleDiscount) {
          bestSingleDiscount = disc;
          bestSingleSnapshot = [
            {
              id: c.id,
              code: c.code,
              discount_in_cents: disc,
              type: c.type,
            },
          ];
        }
      }

      // DECISÃO: Quem ganha?
      // Nota: Cupons cumulativos "ganham" se a soma deles for maior que o melhor individual.
      // Se não houver cumulativos, o melhor individual ganha.
      // Se houver cumulativos mas um individual for melhor (ex: 90% off), o individual ganha.

      if (cumulativeTotalDiscount >= bestSingleDiscount) {
        finalDiscount = cumulativeTotalDiscount;
        appliedCouponsList = cumulativeAppliedSnapshots;
      } else {
        finalDiscount = bestSingleDiscount;
        appliedCouponsList = bestSingleSnapshot;
      }

      // --- VALIDAÇÃO FINAL DE LIMITES (Pisos e Tetos Globais) ---

      // 1. Separa o desconto total em "Parcela Frete" e "Parcela Produto" para validar limites
      const shippingDiscountTotal = appliedCouponsList
        .filter((c) => c.type === "shipping")
        .reduce((acc, c) => acc + c.discount_in_cents, 0);

      const productDiscountTotal = appliedCouponsList
        .filter((c) => c.type !== "shipping")
        .reduce((acc, c) => acc + c.discount_in_cents, 0);

      // Trava Frete: Desconto não pode ser maior que o custo do frete
      let effectiveShippingDiscount = shippingDiscountTotal;
      if (effectiveShippingDiscount > shippingCostInCents) {
        effectiveShippingDiscount = shippingCostInCents;
      }

      // Trava Produto (Hard Floor): Subtotal - Desconto não pode ser menor que Preço Mínimo
      let effectiveProductDiscount = productDiscountTotal;
      const maxAllowedProductDiscount = subtotal - totalMinimumFloor;

      if (effectiveProductDiscount > maxAllowedProductDiscount) {
        effectiveProductDiscount = maxAllowedProductDiscount;
      }

      // Recalcula o total final real
      finalDiscount = effectiveShippingDiscount + effectiveProductDiscount;

      // Atualiza os valores nos snapshots para refletir os cortes (opcional, mas bom para auditoria)
      // (Simplificação: apenas salvamos o total geral descontado no pedido)
    }

    const total = subtotal + shippingCostInCents - finalDiscount;

    const orderQuery = {
      text: `
        INSERT INTO orders (
          user_id, 
          subtotal_in_cents, 
          discount_in_cents, 
          shipping_cost_in_cents, 
          total_in_cents,
          payment_method,
          shipping_address_snapshot,
          shipping_method,
          shipping_details,
          status,
          created_at,
          applied_coupons
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', now(), $10)
        RETURNING *;
      `,
      values: [
        cleanValues.user_id,
        subtotal,
        finalDiscount,
        cleanValues.shipping_cost_in_cents,
        total,
        cleanValues.payment_method,
        JSON.stringify(cleanValues.shipping_address_snapshot),
        cleanValues.shipping_method,
        JSON.stringify(cleanValues.shipping_details || {}),
        JSON.stringify(appliedCouponsList),
      ],
    };

    const orderResult = await client.query(orderQuery);
    createdOrder = orderResult.rows[0];

    for (const item of itemsToInsert) {
      await client.query({
        text: `
          INSERT INTO order_items (
            order_id, product_id, product_name_snapshot, 
            quantity, unit_price_in_cents, total_in_cents
          ) VALUES ($1, $2, $3, $4, $5, $6);
        `,
        values: [
          createdOrder.id,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.total,
        ],
      });
    }

    await cart.clearCart(cleanValues.user_id, client);

    await client.query("COMMIT");
    return createdOrder;
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    } else {
      throw database.handleDatabaseError(error);
    }
  } finally {
    client.end();
  }
}

async function findById(orderId) {
  const cleanId = validator({ id: orderId }, { id: "required" }).id;

  const orderResult = await database.query({
    text: "SELECT * FROM orders WHERE id = $1;",
    values: [cleanId],
  });

  if (orderResult.rowCount === 0) {
    throw new NotFoundError({
      message: "Pedido não encontrado.",
    });
  }

  const itemsResult = await database.query({
    text: "SELECT * FROM order_items WHERE order_id = $1;",
    values: [cleanId],
  });

  return {
    ...orderResult.rows[0],
    items: itemsResult.rows,
  };
}

/**
 * Atualiza as informações de pagamento do pedido.
 * Usado após receber a resposta do Gateway (Mercado Pago).
 */
async function updatePaymentInfo(
  orderId,
  { gatewayId, gatewayData, gatewayStatus },
) {
  const cleanValues = validator(
    { id: orderId, gatewayId, gatewayData, gatewayStatus },
    {
      id: "required",
      gatewayId: "required",
      gatewayData: "required",
      gatewayStatus: "optional",
    },
  );

  const query = {
    text: `
      UPDATE orders
      SET 
        payment_gateway_id = $2,
        gateway_data = $3,
        status = COALESCE($4, status),
        updated_at = (now() at time zone 'utc')
      WHERE id = $1
      RETURNING *;
    `,
    values: [
      cleanValues.id,
      cleanValues.gatewayId,
      JSON.stringify(cleanValues.gatewayData),
      cleanValues.gatewayStatus || null,
    ],
  };

  const result = await database.query(query);

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Pedido não encontrado para atualização de pagamento.",
    });
  }

  return result.rows[0];
}

/**
 * Cancela um pedido e devolve os itens ao estoque.
 */
async function cancel(orderId) {
  const cleanId = validator({ id: orderId }, { id: "required" }).id;
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    // 1. Verifica status atual com Lock
    const orderCheck = await client.query({
      text: "SELECT status FROM orders WHERE id = $1 FOR UPDATE",
      values: [cleanId],
    });

    if (orderCheck.rowCount === 0) {
      throw new NotFoundError({ message: "Pedido não encontrado." });
    }
    const currentStatus = orderCheck.rows[0].status;

    if (currentStatus === "canceled") {
      await client.query("ROLLBACK");
      return orderCheck.rows[0]; // Já está cancelado
    }

    // Impede cancelamento automático se já foi enviado ou entregue
    if (["shipped", "delivered"].includes(currentStatus)) {
      throw new ServiceError({
        message:
          "Não é possível cancelar um pedido que já foi enviado ou entregue.",
      });
    }

    // 2. Busca os itens para devolver ao estoque
    const itemsRes = await client.query({
      text: "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
      values: [cleanId],
    });

    // 3. Devolve Estoque
    for (const item of itemsRes.rows) {
      await client.query({
        text: "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2",
        values: [item.quantity, item.product_id],
      });
    }

    // 4. Atualiza Status do Pedido
    const updateRes = await client.query({
      text: `
        UPDATE orders 
        SET status = 'canceled', updated_at = (now() at time zone 'utc') 
        WHERE id = $1 
        RETURNING *
      `,
      values: [cleanId],
    });

    await client.query("COMMIT");
    return updateRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.end();
  }
}

export default {
  createFromCart,
  findById,
  updatePaymentInfo,
  cancel,
};
