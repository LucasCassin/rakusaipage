import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import validator from "models/validator.js";
import order from "models/order.js";
import product from "models/product.js";
import cart from "models/cart.js";
import { ValidationError } from "errors/index.js";
import authorization from "models/authorization.js";

const router = createRouter();

router.use(authentication.injectAnonymousOrUser);

router.post(
  authorization.canRequest("shop:consumer:view"),
  validateSimulationBody,
  simulationHandler,
);

export default router.handler(controller.errorsHandlers);

function validateSimulationBody(req, res, next) {
  try {
    const body = req.body || {};

    // Normaliza cupons (string unica -> array)
    let normalizedCodes = undefined;
    if (body.coupon_codes && Array.isArray(body.coupon_codes)) {
      normalizedCodes = body.coupon_codes;
    } else if (body.coupon_code) {
      normalizedCodes = [body.coupon_code];
    } else if (body.code) {
      normalizedCodes = [body.code];
    }

    // Mapeia shop_items se vier como items
    const itemsToValidate = body.items || body.shop_items;

    const cleanValues = validator(
      {
        ...body,
        coupon_codes: normalizedCodes,
        shop_items: itemsToValidate,
      },
      {
        shipping_address_snapshot: "required", // Necessário para CEP
        shipping_method: "required", // Necessário para escolher o preço
        coupon_codes: "optional",
        shop_items: "optional", // Se não tiver, tentamos pegar do usuário logado
      },
    );

    req.cleanBody = {
      shipping_address_snapshot: cleanValues.shipping_address_snapshot,
      shipping_method: cleanValues.shipping_method,
      coupon_codes: cleanValues.coupon_codes || [],
      items: cleanValues.shop_items,
    };

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function simulationHandler(req, res) {
  try {
    const { user } = req.context;
    const {
      shipping_address_snapshot,
      shipping_method,
      coupon_codes,
      items: rawItems,
    } = req.cleanBody;

    let itemsToCalculate = [];

    // 1. Definição dos Itens (Banco vs Payload)
    if (rawItems && rawItems.length > 0) {
      // A. Payload explícito (Guest ou simulação rápida)
      // Precisamos hidratar os produtos para pegar preço real e peso do banco (Segurança)
      for (const rawItem of rawItems) {
        const dbProduct = await product.findById(rawItem.product_id);

        if (!dbProduct || !dbProduct.is_active) {
          // Em simulação, podemos ignorar itens inválidos ou lançar erro.
          // Vamos lançar erro para avisar o front que o carrinho tem itens velhos.
          throw new ValidationError({
            message: `O produto ID ${rawItem.product_id} não está disponível.`,
          });
        }

        // Monta objeto com estrutura igual ao do cart.js
        itemsToCalculate.push({
          ...dbProduct, // Traz price_in_cents, weight_in_grams, etc.
          product_id: dbProduct.id,
          quantity: rawItem.quantity,
          unit_price_in_cents:
            dbProduct.promotional_price_in_cents || dbProduct.price_in_cents,
        });
      }
    } else if (user.id) {
      // B. Usuário Logado (Pega do Banco)
      const userCart = await cart.getCart(user.id);
      itemsToCalculate = userCart.items;
    }

    if (itemsToCalculate.length === 0) {
      // Carrinho vazio retorna tudo zerado
      return res.status(200).json({
        subtotal: 0,
        shipping_cost: 0,
        discount: 0,
        total: 0,
        applied_coupons: [],
        shipping_details: null,
      });
    }

    // 2. Recalcula Frete (usando items hidratados)
    const shippingInfo = await order.recalculateShippingCost(
      itemsToCalculate,
      shipping_address_snapshot,
      shipping_method,
    );

    // 3. Calcula Totais e Descontos
    const totals = await order.calculateTotals({
      userId: user.id || "guest_simulation",
      items: itemsToCalculate,
      shippingCostInCents: shippingInfo.costInCents,
      couponCodes: coupon_codes,
    });

    // Retorna estrutura completa para o frontend
    res.status(200).json({
      ...totals,
      shipping_details: shippingInfo.details, // Inclui prazo de entrega
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
