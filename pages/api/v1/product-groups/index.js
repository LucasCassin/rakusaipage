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

// GET: Listar grupos (Requer permissão de visualização da loja)
router.get(
  authorization.canRequest("shop:consumer:view"),
  validateGetQuery,
  getHandler,
);

// POST: Criar um novo grupo (Apenas Admin)
router.post(
  authorization.canRequest("shop:products:manage"),
  validateCreateBody,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

function validateGetQuery(req, res, next) {
  try {
    const query = req.query || {};
    const preparedQuery = {
      ...query,
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
      search_term: query.search ? query.search.toString() : undefined,
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

    if (preparedQuery.search_term === undefined) {
      delete preparedQuery.search_term;
    }

    req.cleanQuery = validator(preparedQuery, {
      limit: "optional",
      offset: "optional",
      category: "optional",
      is_active: "optional",
      search_term: "optional",
    });

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateCreateBody(req, res, next) {
  try {
    req.cleanBody = validator(req.body || {}, {
      name: "required",
      slug: "required",
      description: "optional",
      images: "optional",
      is_active: "optional",
    });

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function postHandler(req, res) {
  try {
    const newGroup = await productGroup.create(req.cleanBody);
    return res.status(201).json(newGroup);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { limit, offset, is_active, search_term: search } = req.cleanQuery;
    const userFeatures = req.context.user?.features || [];
    const isAdmin = userFeatures.includes("shop:products:manage");

    // Se não for admin, forçamos a listagem apenas de grupos ativos
    const activeFilter = isAdmin ? is_active : true;

    const result = await productGroup.findAll({
      limit,
      offset,
      is_active: activeFilter,
      search,
    });

    return res.status(200).json(result);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
