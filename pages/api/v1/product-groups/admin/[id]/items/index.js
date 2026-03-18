import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import productGroup from "models/product_group.js";
import validator from "models/validator.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Apenas administradores podem gerir os itens de um grupo
const requireAdmin = authorization.canRequest("shop:products:manage");

router.post(requireAdmin, validateGroupId, validateCreateBody, postHandler);

export default router.handler(controller.errorsHandlers);

function validateGroupId(req, res, next) {
  try {
    req.cleanQuery = validator(req.query, { id: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateCreateBody(req, res, next) {
  try {
    req.cleanBody = validator(req.body || {}, {
      product_id: "required",
      variations: "optional",
    });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function postHandler(req, res) {
  try {
    const { id: groupId } = req.cleanQuery;
    const { product_id, variations } = req.cleanBody;

    const addedItem = await productGroup.addItem(
      groupId,
      product_id,
      variations,
    );

    return res.status(201).json(addedItem);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
