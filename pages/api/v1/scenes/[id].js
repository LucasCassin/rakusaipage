import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import scene from "models/scene.js";
// presentation, NotFoundError e ForbiddenError não são mais necessários

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota PATCH (Atualizar Cena) ---
router.patch(
  // A verificação de "dono" (checkOwnership) foi removida.
  // A "chave" antiga ("update:presentation") foi trocada por "update:scene".
  authorization.canRequest("update:scene"),
  patchHandler,
);

// --- Rota DELETE (Deletar Cena) ---
router.delete(
  // A verificação de "dono" (checkOwnership) foi removida.
  // A "chave" antiga ("update:presentation") foi trocada por "delete:scene".
  authorization.canRequest("delete:scene"),
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para PATCH /api/v1/scenes/[id]
 * Atualiza o nome, ordem ou descrição de uma cena.
 */
async function patchHandler(req, res) {
  try {
    const { id: scene_id } = req.query;

    // A permissão já foi validada pelo canRequest.
    // O modelo 'scene.update' valida 'name', 'order', 'description'
    // e cuida do 404.
    const updatedScene = await scene.update(scene_id, req.body);
    res.status(200).json(updatedScene);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para DELETE /api/v1/scenes/[id]
 * Deleta uma cena.
 */
async function deleteHandler(req, res) {
  try {
    const { id: scene_id } = req.query;

    // A permissão já foi validada pelo canRequest.
    // O modelo 'scene.del' cuida do 404.
    const deletedScene = await scene.del(scene_id);
    res.status(200).json(deletedScene);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
