import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Middleware para verificar se o usuário é o dono
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { id: presentation_id } = req.query;

  const pres = await presentation.findById(presentation_id);
  if (!pres) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }

  if (pres.created_by_user_id !== user.id) {
    throw new ForbiddenError({
      message: "Você não tem permissão para acessar este recurso.",
    });
  }

  next();
}

// --- Rota PATCH (Edição Global) ---
router.patch(
  authorization.canRequest("update:presentation"),
  checkOwnership,
  patchHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para PATCH /api/v1/presentations/[id]/element-names
 * Atualiza um 'display_name' e 'assigned_user_id' em todas as cenas.
 */
async function patchHandler(req, res) {
  try {
    const { id: presentation_id } = req.query;

    // O modelo 'updateElementGlobally' valida o req.body
    const result = await presentation.updateElementGlobally(
      presentation_id,
      req.body,
    );

    res.status(200).json(result); // Retorna { updatedCount: X }
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
