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

// Todas as operações nesta rota exigem privilégios de gestão
const requireAdmin = authorization.canRequest("shop:products:manage");

router.get(requireAdmin, validateId, getHandler);
router.put(requireAdmin, validateId, validateBody, putHandler);
router.delete(requireAdmin, validateId, deleteHandler);

export default router.handler(controller.errorsHandlers);

function validateId(req, res, next) {
  try {
    req.cleanQuery = validator(req.query, { id: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateBody(req, res, next) {
  try {
    const body = req.body || {};

    const parseBool = (val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return undefined;
    };

    const prepared = {
      ...body,
      is_active: parseBool(body.is_active),
    };

    if (typeof body.images === "string") {
      try {
        prepared.images = JSON.parse(body.images);
      } catch {
        prepared.images = undefined;
      }
    }
    // Remove chaves undefined para não sobrescrever dados existentes com undefined
    Object.keys(prepared).forEach(
      (key) => prepared[key] === undefined && delete prepared[key],
    );

    req.cleanBody = validator(prepared, {
      name: "optional",
      slug: "optional",
      description: "optional",
      images: "optional",
      is_active: "optional",
    });

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const group = await productGroup.findById(id);
    return res.status(200).json(group);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function putHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const updatedGroup = await productGroup.update(id, req.cleanBody);
    return res.status(200).json(updatedGroup);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function deleteHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const deletedGroup = await productGroup.del(id);
    return res.status(200).json(deletedGroup);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
