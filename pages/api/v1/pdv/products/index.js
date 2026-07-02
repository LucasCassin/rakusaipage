import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import pdvProduct from "models/pdv_product.js";
import validator from "models/validator.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(
  authorization.canRequestAny(["pdv:sell", "pdv:products:manage"]),
  validateGetQuery,
  getHandler,
);

export default router.handler(controller.errorsHandlers);

function validateGetQuery(req, res, next) {
  try {
    const query = req.query || {};
    const preparedQuery = {
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
      search_term: query.search,
      is_active:
        query.is_active === "true"
          ? true
          : query.is_active === "false"
            ? false
            : undefined,
    };

    if (preparedQuery.is_active === undefined) {
      delete preparedQuery.is_active;
    }

    req.cleanQuery = validator(preparedQuery, {
      limit: "optional",
      offset: "optional",
      search_term: "optional",
      is_active: "optional",
    });

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const {
      limit,
      offset,
      search_term: search,
      is_active: isActive,
    } = req.cleanQuery;

    const userFeatures = req.context?.user?.features || [];
    const isAdmin = userFeatures.includes("pdv:products:manage");

    const result = await pdvProduct.findAll({
      limit,
      offset,
      search,
      // Vendedores comuns (só pdv:sell) sempre veem apenas produtos ativos.
      isActive: isAdmin ? isActive : true,
    });
    res.status(200).json(result);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
