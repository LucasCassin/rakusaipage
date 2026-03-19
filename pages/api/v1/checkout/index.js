import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import order from "models/order.js";
import userModel from "models/user.js";
import cart from "models/cart.js";
import paymentGateway from "services/payment-gateway.js";
import validator from "models/validator.js";
import { generatePassword } from "src/utils/generatePassword.js";
import { ValidationError, ForbiddenError } from "errors/index.js";
import crypto from "crypto";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.post(
  authorization.canRequest("shop:consumer:view"),
  validateCheckoutBody,
  checkoutHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Valida o payload.
 * Mapeia campos do front para o schema do validator.js.
 */
function validateCheckoutBody(req, res, next) {
  try {
    const body = req.body || {};

    let normalizedCodes = undefined;
    if (body.codes && Array.isArray(body.codes)) {
      normalizedCodes = body.codes;
    } else if (body.coupon_code) {
      normalizedCodes = [body.coupon_code];
    } else if (body.code) {
      normalizedCodes = [body.code];
    }

    const dataToValidate = {
      ...body,
      shop_items: body.items,
      username: body.customer?.username || body.username,
      email: body.customer?.email || body.email,
      coupon_codes: normalizedCodes,
    };

    // Define regras dinâmicas baseadas na autenticação
    const validationSchema = {
      payment_method: "required",
      shipping_address_snapshot: "required", // validator.js usa este nome para o JSONB
      code: "optional",
      shop_items: "optional",
      shipping_method: "required",
      coupon_codes: "optional",
    };

    // Se não tem ID na sessão, é Guest: Exige dados de cadastro
    if (!req.context.user?.id) {
      validationSchema.username = "required";
      validationSchema.email = "required";
    }

    // Validação
    const cleanData = validator(dataToValidate, validationSchema);

    // Devolvemos ao req.cleanBody mantendo a estrutura que o handler espera
    req.cleanBody = {
      ...cleanData,
      items: cleanData.shop_items, // Volta para o nome 'items' para uso no handler
      customer: {
        username: cleanData.username,
        email: cleanData.email,
      },
      code: normalizedCodes,
    };

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function checkoutHandler(req, res) {
  try {
    let currentUser = req.context.user;
    const {
      payment_method,
      shipping_address_snapshot,
      code,
      customer,
      items,
      shipping_method,
    } = req.cleanBody;

    // --- LÓGICA DE GUEST / SHADOW USER ---
    if (!currentUser.id) {
      if (!items || items.length === 0) {
        throw new ValidationError({ message: "O carrinho está vazio." });
      }

      // 1. Verifica se usuário já existe
      const existingUser = await userModel.findOneUser({
        email: customer.email,
      });
      if (existingUser) {
        // CENÁRIO A: Usuário existe e é REAL (não começa com ecmlc)
        if (!existingUser.username.startsWith("ecmlc")) {
          // Salva o carrinho para ele não perder os itens
          await cart.syncLocalCart(existingUser.id, items);

          throw new ForbiddenError({
            message:
              "Seus itens foram salvos no seu carrinho. Por favor, faça login para concluir a compra.",
            action:
              "Seus itens foram salvos no seu carrinho. Faça login para continuar.",
          });
        }

        // CENÁRIO B: Usuário existe e é SHADOW (começa com ecmlc)
        // Permite continuar sem login explícito
        currentUser = existingUser;

        // Sincroniza itens novos com o carrinho antigo dele
        await cart.syncLocalCart(currentUser.id, items);
      } else {
        // CENÁRIO C: Novo Usuário Shadow
        const password = generatePassword();
        const randomSuffix = crypto.randomBytes(4).toString("hex");

        // Gera username único: ecmlc + nome limpo + random
        // Ex: ecmlclucas_a1b2c3d4
        const cleanUsername = customer.username
          .replace(/[^a-zA-Z0-9]/g, "")
          .substring(0, 10);

        const shadowUsername =
          `ecmlc${cleanUsername}${randomSuffix}`.toLowerCase();

        currentUser = await userModel.create({
          username: shadowUsername,
          email: customer.email,
          password: password, // Manda string, o model faz o hash
        });
        // Remove features de acesso ao sistema (Trava o usuário na loja)
        await userModel.removeFeatures(currentUser, [
          "create:session",
          "read:session:self",
          "read:user:self",
        ]);

        // Popula o carrinho do novo usuário
        await cart.syncLocalCart(currentUser.id, items);
      }
    }

    // --- FLUXO DE PEDIDO ---

    // 1. Cria Pedido (Consome do carrinho do banco)
    const newOrder = await order.createFromCart({
      userId: currentUser.id,
      paymentMethod: payment_method,
      shippingAddress: shipping_address_snapshot,
      couponCodes: code,
      shippingMethod: shipping_method,
    });

    // 2. Pagamento
    let paymentResult = {};
    if (payment_method === "pix") {
      const gatewayResponse = await paymentGateway.createPixPayment(
        newOrder,
        currentUser,
      );

      const updatedOrder = await order.updatePaymentInfo(newOrder.id, {
        gatewayId: gatewayResponse.gateway_id,
        gatewayData: gatewayResponse,
        gatewayStatus: "pending",
      });

      paymentResult = {
        order: updatedOrder,
        payment: gatewayResponse,
      };
    } else {
      paymentResult = { order: newOrder };
    }

    res.status(201).json(paymentResult);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
