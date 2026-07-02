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

router.patch(validatePatchInput, patchHandler);

export default router.handler(controller.errorsHandlers);

function validatePatchInput(req, res, next) {
  try {
    const { id } = req.query;
    const body = req.body || {};

    req.cleanQuery = validator({ id }, { id: "required" });
    req.cleanBody = validator(
      { stock_delta_quantity: body.delta_quantity },
      { stock_delta_quantity: "required" },
    );
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function patchHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const { stock_delta_quantity: deltaQuantity } = req.cleanBody;
    const updatedProduct = await pdvProduct.adjustStock(id, deltaQuantity);
    res.status(200).json(updatedProduct);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
