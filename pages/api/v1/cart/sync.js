import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import cart from "models/cart.js";
import { UnauthorizedError, ValidationError } from "errors/index.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.post(
  authorization.canRequest("shop:consumer:view"),
  validateSyncBody,
  syncCartHandler,
);

export default router.handler(controller.errorsHandlers);

function validateSyncBody(req, res, next) {
  try {
    const items = req.body;

    if (!Array.isArray(items)) {
      throw new ValidationError({
        message: "O corpo da requisição deve ser um array de itens.",
      });
    }

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function syncCartHandler(req, res) {
  try {
    const user = req.context.user;
    const localItems = req.body; // Array vindo do frontend

    if (user.id === undefined) {
      throw new UnauthorizedError({
        message: "Usuário não autenticado.",
      });
    }

    // Chama a função nova do modelo
    const syncedCart = await cart.syncLocalCart(user.id, localItems);

    res.status(200).json(syncedCart);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
