import database from "infra/database.js";
import cart from "models/cart.js";
import coupon from "models/coupon.js";
import validator from "models/validator.js";
import { ValidationError, NotFoundError } from "errors/index.js";

async function createFromCart({
  userId,
  paymentMethod,
  shippingAddress,
  shippingCostInCents,
  couponCode,
}) {
  const cleanValues = validator(
    {
      user_id: userId,
      payment_method: paymentMethod,
      shipping_address_snapshot: shippingAddress,
      shipping_cost_in_cents: shippingCostInCents,
      code: couponCode,
    },
    {
      user_id: "required",
      payment_method: "required",
      shipping_address_snapshot: "required",
      shipping_cost_in_cents: "required",
      code: "optional",
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
      if (!item.is_active) {
        throw new ValidationError({
          message: `O produto "${item.name}" não está mais disponível.`,
        });
      }
      if (item.stock_quantity < item.quantity) {
        throw new ValidationError({
          message: `Estoque insuficiente para o produto "${item.name}".`,
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
    }

    // 3. Aplicação de Cupom com Regra de Piso (Minimum Price)
    let discount = 0;
    let appliedCouponId = null;

    if (cleanValues.code) {
      const validCoupon = await coupon.validate(
        cleanValues.code,
        cleanValues.user_id,
        subtotal,
      );

      appliedCouponId = validCoupon.id;

      // Desconto Ideal (Calculado)
      let calculatedDiscount = Math.round(
        subtotal * (validCoupon.discount_percentage / 100),
      );

      // Regra do Piso: O subtotal final (subtotal - desconto) não pode ser menor que totalMinimumFloor
      const maxAllowedDiscount = subtotal - totalMinimumFloor;

      if (maxAllowedDiscount < 0) {
        // Caso raro onde o preço de venda já está abaixo do mínimo configurado (erro de cadastro)
        discount = 0;
      } else if (calculatedDiscount > maxAllowedDiscount) {
        // Limita o desconto ao máximo permitido para não furar o piso
        discount = maxAllowedDiscount;
      } else {
        discount = calculatedDiscount;
      }
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
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', now())
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

export default {
  createFromCart,
  findById,
};
