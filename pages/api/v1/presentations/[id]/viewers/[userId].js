import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentationViewer from "models/presentation_viewer.js";
import validator from "models/validator.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota DELETE (Remover do Elenco) ---
router.delete(
  authorization.canRequest("delete:viewer"),
  deleteValidator,
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

function deleteValidator(req, res, next) {
  req.query = validator(
    { presentation_id: req.query?.id, user_id: req.query?.userId },
    { presentation_id: "required", user_id: "required" },
  );
  next();
}

/**
 * Handler para DELETE /api/v1/presentations/[id]/viewers/[userId]
 * Remove um usuário do elenco.
 */
async function deleteHandler(req, res) {
  try {
    const { presentation_id, user_id } = req.query;

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
