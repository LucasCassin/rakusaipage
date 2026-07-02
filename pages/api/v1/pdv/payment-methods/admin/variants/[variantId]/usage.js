import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import pdvPaymentMethod from "models/pdv_payment_method.js";
import validator from "models/validator.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired)
  .use(authorization.canRequest("pdv:payment_methods:manage"));

router.get(validateGetInput, getHandler);

export default router.handler(controller.errorsHandlers);

function validateGetInput(req, res, next) {
  try {
    const { variantId } = req.query;
    req.cleanQuery = validator({ id: variantId }, { id: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const inUse = await pdvPaymentMethod.isVariantInUse(id);
    res.status(200).json({ in_use: inUse });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
