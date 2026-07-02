import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import pdvProduct from "models/pdv_product.js";
import validator from "models/validator.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired)
  .use(authorization.canRequest("pdv:products:manage"));

router.get(validateGetInput, getHandler);

export default router.handler(controller.errorsHandlers);

function validateGetInput(req, res, next) {
  try {
    const { id } = req.query;
    req.cleanQuery = validator({ id }, { id: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const inUse = await pdvProduct.isInUse(id);
    res.status(200).json({ in_use: inUse });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
