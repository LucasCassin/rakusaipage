import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import sceneElement from "models/scene_element.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Middleware para verificar se o usuário é o dono (através da cena > apresentação)
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { id: element_id } = req.query;

  const element = await sceneElement.findById(element_id);
  if (!element) {
    throw new NotFoundError({ message: "Elemento de cena não encontrado." });
  }

  const scn = await scene.findById(element.scene_id);
  const pres = await presentation.findById(scn.presentation_id);

  if (pres.created_by_user_id !== user.id) {
    throw new ForbiddenError({
      message: "Você não tem permissão para modificar este elemento.",
    });
  }

  req.context.element = element;
  next();
}

// --- Rota PATCH (Atualizar Elemento) ---
router.patch(
  authorization.canRequest("update:presentation"),
  checkOwnership,
  patchHandler,
);

// --- Rota DELETE (Deletar Elemento) ---
router.delete(
  authorization.canRequest("update:presentation"),
  checkOwnership,
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

    // O modelo 'sceneElement.update' valida o body
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

    const deletedElement = await sceneElement.del(element_id);

    res.status(200).json(deletedElement);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
