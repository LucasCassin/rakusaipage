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

const requireAdmin = authorization.canRequest("shop:products:manage");

router.put(requireAdmin, validateIds, validateBody, putHandler);
router.delete(requireAdmin, validateIds, deleteHandler);

export default router.handler(controller.errorsHandlers);

function validateIds(req, res, next) {
  try {
    req.cleanQuery = validator(
      { id: req.query.id, product_id: req.query.productId },
      {
        id: "required",
        product_id: "required",
      },
    );
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateBody(req, res, next) {
  try {
    req.cleanBody = validator(req.body || {}, {
      variations: "required",
    });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function putHandler(req, res) {
  try {
    const { id: groupId, product_id: productId } = req.cleanQuery;
    const { variations } = req.cleanBody;

    const updatedItem = await productGroup.updateItemVariations(
      groupId,
      productId,
      variations,
    );

    return res.status(200).json(updatedItem);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function deleteHandler(req, res) {
  try {
    const { id: groupId, product_id: productId } = req.cleanQuery;

    const deletedItem = await productGroup.removeItem(groupId, productId);

    return res.status(200).json(deletedItem);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
