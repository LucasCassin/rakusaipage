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
  couponCode,
  shippingMethod, // "PAC", "SEDEX", "PICKUP"
  shippingDetails,
}) {
  const cleanValues = validator(
    {
      user_id: userId,
      payment_method: paymentMethod,
      shipping_address_snapshot: shippingAddress,
      shipping_cost_in_cents: shippingCostInCents,
      code: couponCode,
      shipping_method: shippingMethod,
      shipping_details: shippingDetails,
    },
    {
      user_id: "required",
      payment_method: "required",
      shipping_address_snapshot: "required",
      shipping_cost_in_cents: "required",
      code: "optional",
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
    let discount = 0;
    let appliedCouponId = null;

    if (cleanValues.code) {
      const validCoupon = await coupon.validate(
        cleanValues.code,
        cleanValues.user_id,
        subtotal, // Mínimo de compra sempre valida pelo subtotal dos produtos
      );

      appliedCouponId = validCoupon.id;
      let calculatedDiscount = 0;

      // LOGICA BIFURCADA
      if (validCoupon.type === "shipping") {
        // --- CUPOM DE FRETE ---
        // Base de cálculo é o valor do frete
        const shippingCost = cleanValues.shipping_cost_in_cents;

        // Calcula porcentagem (Ex: 100% off)
        calculatedDiscount = Math.round(
          shippingCost * (validCoupon.discount_percentage / 100),
        );

        // Aplica Teto Máximo (Ex: Limitado a R$ 50,00)
        if (
          validCoupon.max_discount_in_cents &&
          calculatedDiscount > validCoupon.max_discount_in_cents
        ) {
          calculatedDiscount = validCoupon.max_discount_in_cents;
        }

        // Garante que não desconta mais que o valor do frete (não pode ficar negativo)
        if (calculatedDiscount > shippingCost) {
          calculatedDiscount = shippingCost;
        }
      } else {
        // --- CUPOM DE PRODUTO (Subtotal) ---
        // Base de cálculo é o subtotal
        calculatedDiscount = Math.round(
          subtotal * (validCoupon.discount_percentage / 100),
        );

        // Aplica Teto Máximo (se houver)
        if (
          validCoupon.max_discount_in_cents &&
          calculatedDiscount > validCoupon.max_discount_in_cents
        ) {
          calculatedDiscount = validCoupon.max_discount_in_cents;
        }

        // Regra do Piso (Hard Floor dos Produtos)
        // O subtotal final não pode ser menor que o totalMinimumFloor
        const maxAllowedDiscount = subtotal - totalMinimumFloor;

        if (maxAllowedDiscount < 0) {
          calculatedDiscount = 0;
        } else if (calculatedDiscount > maxAllowedDiscount) {
          calculatedDiscount = maxAllowedDiscount;
        }
      }

      discount = calculatedDiscount;
    }

    const total = subtotal + cleanValues.shipping_cost_in_cents - discount;

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
          applied_coupon_id,
          shipping_method,
          shipping_details,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', now())
        RETURNING *;
      `,
      values: [
        cleanValues.user_id,
        subtotal,
        discount,
        cleanValues.shipping_cost_in_cents,
        total,
        cleanValues.payment_method,
        JSON.stringify(cleanValues.shipping_address_snapshot),
        appliedCouponId,
        cleanValues.shipping_method,
        JSON.stringify(cleanValues.shipping_details || {}),
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
