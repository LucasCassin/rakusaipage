import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import sceneElement from "models/scene_element.js";
// presentation, scene, NotFoundError e ForbiddenError não são mais necessários

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota PATCH (Atualizar Elemento) ---
router.patch(
  // A verificação de "dono" (checkOwnership) foi removida.
  // A "chave" antiga ("update:presentation") foi trocada por "update:element".
  authorization.canRequest("update:element"),
  patchHandler,
);

// --- Rota DELETE (Deletar Elemento) ---
router.delete(
  // A verificação de "dono" (checkOwnership) foi removida.
  // A "chave" antiga ("update:presentation") foi trocada por "delete:element".
  authorization.canRequest("delete:element"),
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para PATCH /api/v1/scene_elements/[id]
 * Atualiza posição, nome ou usuário de um elemento.
 */
async function patchHandler(req, res) {
  try {
    const { id: element_id } = req.query;

    // A permissão já foi validada pelo canRequest.
    // O modelo 'sceneElement.update' valida o body e cuida do 404.
    const updatedElement = await sceneElement.update(element_id, req.body);

    res.status(200).json(updatedElement);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para DELETE /api/v1/scene_elements/[id]
 * Deleta um elemento da cena.
 */
async function deleteHandler(req, res) {
  try {
    const { id: element_id } = req.query;

    // A permissão já foi validada pelo canRequest.
    // O modelo 'sceneElement.del' cuida do 404.
    const deletedElement = await sceneElement.del(element_id);

    res.status(200).json(deletedElement);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
