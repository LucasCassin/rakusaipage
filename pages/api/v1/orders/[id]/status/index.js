import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import validator from "models/validator.js";
import order from "models/order.js";
import { ValidationError } from "errors/index.js";

const router = createRouter();

router.use(authentication.injectAnonymousOrUser);

router.patch(
  authorization.canRequest("shop:orders:manage"),
  validateStatusUpdate,
  statusUpdateHandler,
);

export default router.handler(controller.errorsHandlers);

function validateStatusUpdate(req, res, next) {
  try {
    const clean = validator(
      { tracking_code: req.body.tracking_code, shop_status: req.body.status },
      {
        shop_status: "required", // 'shipped', 'delivered', 'ready_for_pickup', 'canceled'
        tracking_code:
          req.body.status && req.body.status === "shipped"
            ? "required"
            : "optional", // Obrigatório se status for 'shipped'
      },
    );

    req.query = { id: validator({ id: req.query.id }, { id: "required" }).id };

    req.cleanBody = {
      status: clean.shop_status,
      tracking_code: clean.tracking_code,
    };

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function statusUpdateHandler(req, res) {
  try {
    const { id } = req.query;
    const { status, tracking_code } = req.cleanBody;

    let updatedOrder;

    switch (status) {
      case "shipped":
        if (!tracking_code) {
          throw new ValidationError({
            message:
              "Código de rastreio é obrigatório para marcar como enviado.",
            action: "Informe o 'tracking_code'.",
          });
        }
        updatedOrder = await order.markAsShipped(id, tracking_code);
        break;

      case "ready_for_pickup":
        updatedOrder = await order.markAsReadyForPickup(id);
        break;

      case "delivered":
      case "picked_up":
        // A função markAsDelivered detecta sozinha se deve ir para 'delivered' ou 'picked_up'
        // mas aceitamos explicitamente 'delivered' do front para padronizar.
        updatedOrder = await order.markAsDelivered(id);
        break;

      case "canceled":
        updatedOrder = await order.cancel(id);
        break;

      default:
        throw new ValidationError({
          message: `Transição para o status '${status}' não é suportada por esta rota ou é automática.`,
        });
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
