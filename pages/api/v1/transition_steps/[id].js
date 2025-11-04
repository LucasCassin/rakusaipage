import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import transitionStep from "models/transition_step.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Middleware para verificar se o usuário é o dono (através da cena > apresentação)
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { id: step_id } = req.query;

  const step = await transitionStep.findById(step_id);
  if (!step) {
    throw new NotFoundError({ message: "Passo de transição não encontrado." });
  }

  const scn = await scene.findById(step.scene_id);
  const pres = await presentation.findById(scn.presentation_id);

  if (pres.created_by_user_id !== user.id) {
    throw new ForbiddenError({
      message: "Você não tem permissão para modificar este passo de transição.",
    });
  }

  req.context.step = step;
  next();
}

// --- Rota PATCH (Atualizar Passo) ---
router.patch(
  authorization.canRequest("update:presentation"),
  checkOwnership,
  patchHandler,
);

// --- Rota DELETE (Deletar Passo) ---
router.delete(
  authorization.canRequest("update:presentation"),
  checkOwnership,
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

    // O modelo 'transitionStep.update' valida o body
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

    const deletedStep = await transitionStep.del(step_id);

    res.status(200).json(deletedStep);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
