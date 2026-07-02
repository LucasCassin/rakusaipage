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
    const updatedProduct = await pdvProduct.update(id, req.cleanBody);
    res.status(200).json(updatedProduct);
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
    const removedProduct = isHardDelete
      ? await pdvProduct.hardDelete(id)
      : await pdvProduct.remove(id);
    res.status(200).json(removedProduct);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
