import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Middleware de autorização (o mesmo da rota index)
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { id: presentation_id } = req.query;

  const pres = await presentation.findById(presentation_id);
  if (!pres) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }
  if (pres.created_by_user_id !== user.id) {
    throw new ForbiddenError({
      message:
        "Você não tem permissão para gerenciar o elenco desta apresentação.",
    });
  }
  next();
}

// --- Rota DELETE (Remover do Elenco) ---
router.delete(
  authorization.canRequest("manage:presentation_viewers"), //
  checkOwnership,
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para DELETE /api/v1/presentations/[id]/viewers/[userId]
 * Remove um usuário do elenco.
 */
async function deleteHandler(req, res) {
  try {
    const { id: presentation_id, userId: user_id } = req.query;

    // O modelo 'removeViewer' cuida da lógica e validação
    const deletedViewer = await presentationViewer.removeViewer(
      presentation_id,
      user_id,
    );

    res.status(200).json(deletedViewer);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
