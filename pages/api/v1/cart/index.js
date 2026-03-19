import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import cart from "models/cart.js";
import { UnauthorizedError } from "errors/index.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(authorization.canRequest("shop:consumer:view"), getCartHandler);

router.delete(authorization.canRequest("shop:consumer:view"), clearCartHandler);

export default router.handler(controller.errorsHandlers);

async function getCartHandler(req, res) {
  try {
    const user = req.context.user;
    if (user.id === undefined) {
      throw new UnauthorizedError({
        message: "Usuário não autenticado.",
      });
    }
    const userCart = await cart.getCart(user.id);
    res.status(200).json(userCart);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function clearCartHandler(req, res) {
  try {
    const user = req.context.user;
    if (user.id === undefined) {
      throw new UnauthorizedError({
        message: "Usuário não autenticado.",
      });
    }
    await cart.clearCart(user.id);
    res.status(204).end();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
