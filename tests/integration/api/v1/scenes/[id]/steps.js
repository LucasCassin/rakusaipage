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

// Middleware para verificar se o usuário é o dono da cena
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { id: scene_id } = req.query;

  const scn = await scene.findById(scene_id);
  if (!scn) {
    throw new NotFoundError({ message: "Cena não encontrada." });
  }

  // Validação extra: Só permite adicionar passos a cenas do tipo 'TRANSITION'
  if (scn.type !== "TRANSITION") {
    throw new ForbiddenError({
      message:
        "Passos de transição só podem ser adicionados a cenas do tipo 'TRANSITION'.",
    });
  }

  const pres = await presentation.findById(scn.presentation_id);
  if (pres.created_by_user_id !== user.id) {
    throw new ForbiddenError({
      message: "Você não tem permissão para modificar esta cena.",
    });
  }

  req.context.scene = scn;
  next();
}

// --- Rota POST (Criar Passo de Transição) ---
router.post(
  authorization.canRequest("update:presentation"), // Usa a permissão "pai"
  checkOwnership,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

async function postHandler(req, res) {
  try {
    const { id: scene_id } = req.query;

    // O modelo 'transitionStep.create' valida 'order', 'description', 'assigned_user_id'
    const newStep = await transitionStep.create({
      ...req.body,
      scene_id: scene_id, // Garante o ID da cena
    });

    res.status(201).json(newStep);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
