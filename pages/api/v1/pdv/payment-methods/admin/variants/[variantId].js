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

router.put(validateUpdateInput, putHandler);
router.delete(validateDeleteInput, deleteHandler);

export default router.handler(controller.errorsHandlers);

function validateUpdateInput(req, res, next) {
  try {
    const { variantId } = req.query;
    const body = req.body || {};

    req.cleanQuery = validator({ id: variantId }, { id: "required" });

    const validationKeys = {};
    Object.keys(body).forEach((key) => {
      validationKeys[key] = "optional";
    });

    req.cleanBody = validator(body, validationKeys);
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function putHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const updated = await pdvPaymentMethod.updateVariant(id, req.cleanBody);
    res.status(200).json(updated);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateDeleteInput(req, res, next) {
  try {
    const { variantId } = req.query;
    req.cleanQuery = validator({ id: variantId }, { id: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function deleteHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const removed = await pdvPaymentMethod.removeVariant(id);
    res.status(200).json(removed);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
