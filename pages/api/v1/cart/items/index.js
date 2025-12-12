import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import cart from "models/cart.js";
import validator from "models/validator.js";
import { UnauthorizedError } from "errors/index.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.post(
  authorization.canRequest("shop:consumer:view"),
  validateAddItemBody,
  addItemHandler,
);

export default router.handler(controller.errorsHandlers);

function validateAddItemBody(req, res, next) {
  try {
    req.cleanBody = validator(
      {
        product_id: req.body?.product_id,
        cart_quantity: req.body?.quantity,
      },
      {
        product_id: "required",
        cart_quantity: "required",
      },
    );
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function addItemHandler(req, res) {
  try {
    const user = req.context.user;
    const { product_id, cart_quantity: quantity } = req.cleanBody;

    if (user.id === undefined) {
      throw new UnauthorizedError({
        message: "Usuário não autenticado.",
      });
    }

    const item = await cart.addItem(user.id, {
      product_id,
      quantity,
    });

    res.status(201).json(item);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
