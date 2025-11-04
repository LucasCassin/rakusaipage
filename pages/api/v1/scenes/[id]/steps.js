import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import scene from "models/scene.js"; // <-- Importado para o middleware
import transitionStep from "models/transition_step.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

/**
 * Middleware para validar se a cena pode receber passos de transição.
 * Esta lógica estava no 'checkOwnership' original.
 */
async function validateSceneType(req, res, next) {
  const { id: scene_id } = req.query;

  const scn = await scene.findById(scene_id);
  if (!scn) {
    throw new NotFoundError({ message: "Cena não encontrada." });
  }

  // Validação extra: Só permite adicionar passos a cenas do tipo 'TRANSITION'
  if (scn.scene_type !== "TRANSITION") {
    // Corrigido de 'scn.type' para 'scn.scene_type'
    throw new ForbiddenError({
      message:
        "Passos de transição só podem ser adicionados a cenas do tipo 'TRANSITION'.",
    });
  }

  next();
}

// --- Rota POST (Criar Passo de Transição) ---
router.post(
  // 1. O usuário tem a "chave" para criar um passo?
  authorization.canRequest("create:step"),
  // 2. A cena-alvo é do tipo correto?
  validateSceneType,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para POST /api/v1/scenes/[id]/steps
 * Cria um novo passo na checklist.
 */
async function postHandler(req, res) {
  try {
    const { id: scene_id } = req.query;

    // A permissão e o tipo da cena já foram validados.
    // O modelo 'transitionStep.create' valida o body.
    const newStep = await transitionStep.create({
      ...req.body,
      scene_id: scene_id, // Garante o ID da cena
    });

    res.status(201).json(newStep);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
