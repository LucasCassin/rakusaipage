import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import sceneElement from "models/scene_element.js";
// presentation, scene, NotFoundError e ForbiddenError não são mais necessários

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota POST (Criar Elemento) ---
router.post(
  // A verificação de "dono" (checkOwnership) foi removida.
  // A "chave" antiga ("update:presentation") foi trocada por "create:element".
  authorization.canRequest("create:element"),
  postHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para POST /api/v1/scenes/[id]/elements
 * Cria um novo elemento de cena (ponto no mapa).
 */
async function postHandler(req, res) {
  try {
    const { id: scene_id } = req.query;

    // A permissão já foi validada pelo canRequest.
    // O modelo 'sceneElement.create' valida o body
    // e cuida do 404 se o scene_id for inválido.
    const newElement = await sceneElement.create({
      ...req.body,
      scene_id: scene_id, // Garante que o ID da cena está correto
    });

    res.status(201).json(newElement);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
