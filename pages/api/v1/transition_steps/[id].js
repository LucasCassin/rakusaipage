import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import transitionStep from "models/transition_step.js";
import validator from "models/validator";
// presentation, scene, NotFoundError e ForbiddenError não são mais necessários

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota PATCH (Atualizar Passo) ---
router.patch(
  authorization.canRequest("update:step"),
  stepsIdValidator,
  patchHandler,
);

// --- Rota DELETE (Deletar Passo) ---
router.delete(
  authorization.canRequest("delete:step"),
  stepsIdValidator,
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

function stepsIdValidator(req, res, next) {
  req.query = validator({ id: req.query?.id }, { id: "required" });
  next();
}

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
