import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import pdvSettings from "models/pdv_settings.js";
import validator from "models/validator.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(
  authorization.canRequestAny(["pdv:sell", "pdv:config:manage"]),
  getHandler,
);

router.put(
  authorization.canRequest("pdv:config:manage"),
  validateUpdateInput,
  putHandler,
);

export default router.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  try {
    const settings = await pdvSettings.get();
    res.status(200).json(settings);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateUpdateInput(req, res, next) {
  try {
    const body = req.body || {};
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
    const updated = await pdvSettings.update(req.cleanBody);
    res.status(200).json(updated);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
