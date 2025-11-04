import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentationViewer from "models/presentation_viewer.js";
// Erros e "presentation" não são mais necessários aqui.

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota DELETE (Remover do Elenco) ---
router.delete(
  // A verificação de "dono" (checkOwnership) foi removida.
  // Agora apenas checa se o usuário tem a "chave" para deletar um membro do elenco.
  authorization.canRequest("delete:viewer"),
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

    // A permissão já foi validada pelo canRequest.
    // O modelo 'removeViewer' cuida da lógica e do 404.
    const deletedViewer = await presentationViewer.removeViewer(
      presentation_id,
      user_id,
    );

    res.status(200).json(deletedViewer);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
