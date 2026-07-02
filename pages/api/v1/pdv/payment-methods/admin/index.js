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

router.post(validateCreateBody, postHandler);

export default router.handler(controller.errorsHandlers);

function validateCreateBody(req, res, next) {
  try {
    const body = req.body || {};
    req.cleanBody = validator(body, { name: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function postHandler(req, res) {
  try {
    const newPaymentMethod = await pdvPaymentMethod.create(req.cleanBody);
    res.status(201).json(newPaymentMethod);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
