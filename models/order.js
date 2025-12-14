import database from "infra/database.js";
import cart from "models/cart.js";
import couponModel from "models/coupon.js";
import validator from "models/validator.js";
import shippingService from "services/shipping.js"; // Importado para recalcular frete
import { ValidationError, NotFoundError, ServiceError } from "errors/index.js";

/**
 * Valida os dados de entrada brutos para criação do pedido.
 */
function validateOrderInput(inputData) {
  return validator(inputData, {
    user_id: "required",
    payment_method: "required",
    shipping_address_snapshot: "required",
    shipping_method: "required", // "PAC", "SEDEX", etc.
    coupon_codes: "optional",
    shipping_details: "optional",
  });
}

/**
 * Busca itens do carrinho, valida disponibilidade (ativo) e estoque.
 * Retorna os itens prontos para cálculo ou lança erro.
 */
async function fetchAndValidateCartItems(userId, client) {
  // 1. Busca Carrinho
  const userCart = await cart.getCart(userId, client);

  if (userCart.items.length === 0) {
    throw new ValidationError({
      message: "O carrinho está vazio.",
    });
  }

  // 2. Validações de Negócio (Ativo e Estoque)
  for (const item of userCart.items) {
    if (!item.is_active) {
      throw new ValidationError({
        message: `O produto "${item.name}" não está mais disponível. Remova-o do carrinho para continuar.`,
      });
    }

    if (item.stock_quantity < item.quantity) {
      throw new ValidationError({
        message: `Estoque insuficiente para o produto "${item.name}". Restam apenas ${item.stock_quantity} unidades.`,
      });
    }
  }

  return userCart.items;
}

/**
 * Recalcula o frete no servidor para garantir integridade do valor.
 * Impede que o usuário envie um custo de frete "0" maliciosamente.
 */
async function recalculateShippingCost(items, shippingAddress, selectedMethod) {
  // Extrai o CEP do snapshot de endereço (suportando formatos comuns)
  const zipCodePre =
    shippingAddress.zip_code || shippingAddress.zip || shippingAddress.cep;

  const zipCode = validator(
    { zip_code: zipCodePre },
    { zip_code: "required" },
  ).zip_code;

  if (!zipCode) {
    throw new ValidationError({
      message: "CEP de destino não encontrado no endereço.",
    });
  }

  // Chama o serviço de frete (que conecta nos Correios/API externa)
  // Nota: O serviço de frete deve hidratar/verificar pesos internamente ou confiar nos itens passados
  // Como `items` veio do `fetchAndValidateCartItems` (banco), os pesos são confiáveis.
  const options = await shippingService.calculateShippingOptions(
    zipCode,
    items.map((i) => ({
      product_id: i.product_id, // O formato que o shippingService espera
      quantity: i.quantity,
    })),
  );
  // Encontra a opção escolhida pelo usuário
  const selectedOption = options.find((opt) => opt.type === selectedMethod);

  if (!selectedOption) {
    throw new ValidationError({
      message: `O método de entrega "${selectedMethod}" não está disponível para este pedido.`,
    });
  }

  return {
    costInCents: selectedOption.price_in_cents,
    details: selectedOption, // Retorna detalhes atualizados (prazo, transportadora)
  };
}

/**
 * Motor de Cálculo Financeiro.
 * Processa Subtotal, Múltiplos Cupons, Regras de Melhor Desconto e Limites.
 */
async function calculateTotals({
  userId,
  items,
  shippingCostInCents,
  couponCodes,
}) {
  let subtotal = 0;
  let totalMinimumFloor = 0; // Soma dos preços mínimos dos produtos

  // 1. Calcula Subtotal
  for (const item of items) {
    const totalItem = item.unit_price_in_cents * item.quantity;
    subtotal += totalItem;
    totalMinimumFloor += (item.minimum_price_in_cents || 0) * item.quantity;
  }

  // 2. Lógica de Cupons
  let finalDiscount = 0;
  let appliedCouponsList = [];

  if (couponCodes && couponCodes.length > 0) {
    const validCoupons = await couponModel.validateMultiple(
      couponCodes,
      userId,
      subtotal,
    );

    // Função auxiliar para calcular desconto de UM cupom isolado
    const calculateSingleDiscount = (coupon) => {
      let val = 0;
      const baseValue =
        coupon.type === "shipping" ? shippingCostInCents : subtotal;

      val = Math.round(baseValue * (coupon.discount_percentage / 100));

      if (coupon.max_discount_in_cents && val > coupon.max_discount_in_cents) {
        val = coupon.max_discount_in_cents;
      }
      return val;
    };

    // Estratégia A: Soma dos Cumulativos
    const cumulativeCoupons = validCoupons.filter((c) => c.is_cumulative);
    let cumulativeTotal = 0;
    const cumulativeSnapshots = [];

    for (const c of cumulativeCoupons) {
      const val = calculateSingleDiscount(c);
      cumulativeTotal += val;
      cumulativeSnapshots.push({
        id: c.id,
        code: c.code,
        discount_in_cents: val,
        type: c.type,
      });
    }

    // Estratégia B: O Melhor Não-Cumulativo
    const singleCoupons = validCoupons.filter((c) => !c.is_cumulative);
    let bestSingleTotal = 0;
    let bestSingleSnapshot = [];

    for (const c of singleCoupons) {
      const val = calculateSingleDiscount(c);
      if (val > bestSingleTotal) {
        bestSingleTotal = val;
        bestSingleSnapshot = [
          {
            id: c.id,
            code: c.code,
            discount_in_cents: val,
            type: c.type,
          },
        ];
      }
    }

    // Decisão: Qual estratégia vence?
    if (cumulativeTotal >= bestSingleTotal) {
      finalDiscount = cumulativeTotal;
      appliedCouponsList = cumulativeSnapshots;
    } else {
      finalDiscount = bestSingleTotal;
      appliedCouponsList = bestSingleSnapshot;
    }

    // --- Travas Finais (Limites Globais) ---
    const shippingDiscountSum = appliedCouponsList
      .filter((c) => c.type === "shipping")
      .reduce((acc, c) => acc + c.discount_in_cents, 0);

    const productDiscountSum = appliedCouponsList
      .filter((c) => c.type !== "shipping")
      .reduce((acc, c) => acc + c.discount_in_cents, 0);

    // Trava Frete: Não pode ser negativo
    let effectiveShippingDiscount = Math.min(
      shippingDiscountSum,
      shippingCostInCents,
    );

    // Trava Produto: Não pode furar o preço mínimo (Floor)
    let effectiveProductDiscount = productDiscountSum;
    const maxAllowedProductDiscount = subtotal - totalMinimumFloor;

    if (effectiveProductDiscount > maxAllowedProductDiscount) {
      effectiveProductDiscount = maxAllowedProductDiscount;
    }

    // Recalcula total do desconto validado
    finalDiscount = effectiveShippingDiscount + effectiveProductDiscount;
  }

  const total = subtotal + shippingCostInCents - finalDiscount;

  return {
    subtotal,
    shipping_cost: shippingCostInCents,
    discount: finalDiscount,
    total,
    applied_coupons: appliedCouponsList,
  };
}

/**
 * Função Principal (Facade/Orquestrador).
 * Cria o pedido a partir do carrinho de compras.
 */
async function createFromCart({
  userId,
  paymentMethod,
  shippingAddress,
  couponCodes,
  shippingMethod, // "PAC", "SEDEX", "PICKUP"
}) {
  // 1. Validação de Entrada
  const cleanValues = validateOrderInput({
    user_id: userId,
    payment_method: paymentMethod,
    shipping_address_snapshot: shippingAddress,
    shipping_method: shippingMethod,
    coupon_codes: couponCodes,
  });

  const client = await database.getNewClient();
  let createdOrder = null;

  try {
    await client.query("BEGIN");

    // 2. Busca e Valida Itens do Carrinho
    // Passamos o `client` para garantir leitura consistente dentro da transação
    const items = await fetchAndValidateCartItems(cleanValues.user_id, client);

    // 3. Recalcula Frete (Segurança)
    // Usa os items do banco e o CEP do endereço para obter o valor real
    const shippingInfo = await recalculateShippingCost(
      items,
      cleanValues.shipping_address_snapshot,
      cleanValues.shipping_method,
    );

    // 4. Calcula Totais e Descontos
    const calculation = await calculateTotals({
      userId: cleanValues.user_id,
      items: items,
      shippingCostInCents: shippingInfo.costInCents,
      couponCodes: cleanValues.coupon_codes,
    });

    // 5. Atualiza Estoque (Reserva)
    for (const item of items) {
      await client.query({
        text: `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        values: [item.quantity, item.product_id],
      });
    }

    // 6. Insere o Pedido
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
        calculation.subtotal,
        calculation.discount,
        calculation.shipping_cost,
        calculation.total,
        cleanValues.payment_method,
        JSON.stringify(cleanValues.shipping_address_snapshot),
        cleanValues.shipping_method,
        JSON.stringify(shippingInfo.details), // Usa os detalhes atualizados do serviço de frete
        JSON.stringify(calculation.applied_coupons),
      ],
    };

    const orderResult = await client.query(orderQuery);
    createdOrder = orderResult.rows[0];

    // 7. Insere Itens do Pedido
    for (const item of items) {
      const totalItem = item.unit_price_in_cents * item.quantity;
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
          item.name,
          item.quantity,
          item.unit_price_in_cents,
          totalItem,
        ],
      });
    }

    // 8. Limpa o Carrinho
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

async function cancel(orderId) {
  const cleanId = validator({ id: orderId }, { id: "required" }).id;
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

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
      return orderCheck.rows[0];
    }

    if (["shipped", "delivered"].includes(currentStatus)) {
      throw new ServiceError({
        message:
          "Não é possível cancelar um pedido que já foi enviado ou entregue.",
      });
    }

    const itemsRes = await client.query({
      text: "SELECT product_id, quantity FROM order_items WHERE order_id = $1",
      values: [cleanId],
    });

    for (const item of itemsRes.rows) {
      await client.query({
        text: "UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2",
        values: [item.quantity, item.product_id],
      });
    }

    const updateRes = await client.query({
      text: `UPDATE orders SET status = 'canceled', updated_at = (now() at time zone 'utc') WHERE id = $1 RETURNING *`,
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
  // Exportamos estas funções para serem usadas pela rota de Simulação (Simulate)
  calculateTotals,
  fetchAndValidateCartItems,
  recalculateShippingCost,
  findById,
  updatePaymentInfo,
  cancel,
};
