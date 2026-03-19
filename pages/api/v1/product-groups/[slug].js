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

// GET: Ler um grupo específico pelo Slug (Requer permissão de visualização)
router.get(
  authorization.canRequest("shop:consumer:view"),
  validateSlug,
  getHandler,
);

export default router.handler(controller.errorsHandlers);

function validateSlug(req, res, next) {
  try {
    req.cleanQuery = validator(req.query, { slug: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { slug } = req.cleanQuery;
    const group = await productGroup.findBySlug(slug);
    return res.status(200).json(group);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
