import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import transitionStep from "models/transition_step.js";
// presentation, scene, NotFoundError e ForbiddenError não são mais necessários

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota PATCH (Atualizar Passo) ---
router.patch(
  // A verificação de "dono" (checkOwnership) foi removida.
  // A "chave" antiga ("update:presentation") foi trocada por "update:step".
  authorization.canRequest("update:step"),
  patchHandler,
);

// --- Rota DELETE (Deletar Passo) ---
router.delete(
  // A verificação de "dono" (checkOwnership) foi removida.
  // A "chave" antiga ("update:presentation") foi trocada por "delete:step".
  authorization.canRequest("delete:step"),
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para PATCH /api/v1/transition_steps/[id]
 * Atualiza ordem, descrição ou usuário de um passo.
 */
async function patchHandler(req, res) {
  try {
    const { id: step_id } = req.query;

    // A permissão já foi validada pelo canRequest.
    // O modelo 'transitionStep.update' valida o body e cuida do 404.
    const updatedStep = await transitionStep.update(step_id, req.body);

    res.status(200).json(updatedStep);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para DELETE /api/v1/transition_steps/[id]
 * Deleta um passo da checklist.
 */
async function deleteHandler(req, res) {
  try {
    const { id: step_id } = req.query;

    // A permissão já foi validada pelo canRequest.
    // O modelo 'transitionStep.del' cuida do 404.
    const deletedStep = await transitionStep.del(step_id);

    res.status(200).json(deletedStep);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
