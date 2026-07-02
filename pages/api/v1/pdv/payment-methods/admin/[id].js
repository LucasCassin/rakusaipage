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
    const { id } = req.query;
    const body = req.body || {};

    validator({ id }, { id: "required" });

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
    const { id } = req.query;
    const updated = await pdvPaymentMethod.update(id, req.cleanBody);
    res.status(200).json(updated);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateDeleteInput(req, res, next) {
  try {
    const { id } = req.query;
    validator({ id }, { id: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function deleteHandler(req, res) {
  try {
    const { id } = req.query;
    const isHardDelete = req.query.hard === "true";
    const removed = isHardDelete
      ? await pdvPaymentMethod.hardDelete(id)
      : await pdvPaymentMethod.remove(id);
    res.status(200).json(removed);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
