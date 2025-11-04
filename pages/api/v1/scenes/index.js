import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import scene from "models/scene.js";
// presentation, NotFoundError e ForbiddenError não são mais necessários

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota POST (Criar Cena) ---
router.post(
  // A verificação de "dono" (checkOwnership) foi removida.
  // A "chave" antiga ("update:presentation") foi trocada pela "chave" correta.
  authorization.canRequest("create:scene"),
  postHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para POST /api/v1/scenes
 * Cria uma nova cena (FORMATION ou TRANSITION)
 */
async function postHandler(req, res) {
  try {
    // A permissão já foi validada pelo canRequest.
    // O modelo 'scene.create' valida 'presentation_id', 'name', 'scene_type', 'order'
    // e cuida do 404 se o presentation_id for inválido.
    const newScene = await scene.create(req.body);
    res.status(201).json(newScene);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
