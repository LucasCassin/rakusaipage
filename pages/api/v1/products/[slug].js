import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import product from "models/product.js";
import validator from "models/validator.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(
  // 1. Validação de Acesso Geral à Loja
  authorization.canRequest("shop:consumer:view"),
  // 2. Validação do Slug na URL
  validateSlug,
  // 3. Handler
  getHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Middleware para validar o slug
 */
function validateSlug(req, res, next) {
  try {
    req.cleanQuery = validator(req.query, { slug: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para GET /api/v1/products/[slug]
 */
async function getHandler(req, res) {
  try {
    const { slug } = req.cleanQuery;
    const user = req.context?.user || {};
    const userFeatures = user.features || [];
    const isAdmin = userFeatures.includes("shop:products:manage");

    // 1. Busca o produto (Lança NotFoundError se não existir no banco)
    const foundProduct = await product.findBySlug(slug);

    // 2. Validação de Status (Is Active)
    // Se estiver inativo e usuário NÃO for admin, fingimos que não existe (404)
    if (!foundProduct.is_active && !isAdmin) {
      throw new NotFoundError({
        message: "Produto não encontrado.",
      });
    }

    // 3. Validação de Visibilidade por Feature (Allowed Features)
    // Se o produto tiver restrições E o usuário não for admin
    if (
      foundProduct.allowed_features &&
      foundProduct.allowed_features.length > 0 &&
      !isAdmin
    ) {
      // Verifica se o usuário possui Pelo MENOS UMA das features permitidas
      const hasPermission = foundProduct.allowed_features.some((feature) =>
        userFeatures.includes(feature),
      );

      if (!hasPermission) {
        throw new ForbiddenError({
          message:
            "Você não possui o nível necessário para visualizar este produto.",
          action: "Verifique seu plano de assinatura ou nível de acesso.",
        });
      }
    }

    res.status(200).json(foundProduct);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
