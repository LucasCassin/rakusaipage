import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Middleware para verificar se o usuário é o dono da apresentação
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { presentation_id } = req.body;

  if (!presentation_id) {
    throw new NotFoundError({ message: "A 'presentation_id' é obrigatória." });
  }

  const pres = await presentation.findById(presentation_id);
  if (!pres) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }

  // Só o criador pode adicionar cenas
  if (pres.created_by_user_id !== user.id) {
    throw new ForbiddenError({
      message:
        "Você não tem permissão para adicionar cenas a esta apresentação.",
    });
  }

  next();
}

// --- Rota POST (Criar Cena) ---
router.post(
  authorization.canRequest("update:presentation"), // Usamos a permissão "pai"
  checkOwnership,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

async function postHandler(req, res) {
  try {
    // O modelo 'scene.create' valida 'name', 'scene_type', 'order'
    const newScene = await scene.create(req.body);
    res.status(201).json(newScene);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
