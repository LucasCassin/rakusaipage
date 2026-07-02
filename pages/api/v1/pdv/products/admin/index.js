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

router.post(validateCreateBody, postHandler);

export default router.handler(controller.errorsHandlers);

function validateCreateBody(req, res, next) {
  try {
    const body = req.body || {};

    req.cleanBody = validator(body, {
      name: "required",
      price_in_cents: "required",
      stock_quantity: "optional",
      min_unit_price_in_cents: "optional",
      default_discount_type: "optional",
      default_discount_value: "optional",
      allow_negative_stock: "optional",
      max_negative_stock: "optional",
      is_active: "optional",
    });

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function postHandler(req, res) {
  try {
    const newProduct = await pdvProduct.create(req.cleanBody);
    res.status(201).json(newProduct);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
