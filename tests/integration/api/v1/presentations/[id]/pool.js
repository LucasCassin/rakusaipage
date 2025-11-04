import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Middleware para verificar se o usuário é o dono
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { id: presentation_id } = req.query;

  const pres = await presentation.findById(presentation_id);
  if (!pres) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }

  // Apenas o criador pode editar e, portanto, ver o pool de edição
  if (pres.created_by_user_id !== user.id) {
    throw new ForbiddenError({
      message: "Você não tem permissão para acessar este recurso.",
    });
  }

  next();
}

// --- Rota GET (Buscar o Pool) ---
router.get(
  authorization.canRequest("update:presentation"), // Se pode editar, pode ver o pool
  checkOwnership,
  getHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para GET /api/v1/presentations/[id]/pool
 * Busca os "elementos pré-fabricados" (o Pool) para a paleta.
 */
async function getHandler(req, res) {
  try {
    const { id: presentation_id } = req.query;

    // Usa a função do modelo que criamos
    const pool = await presentation.findElementPool(presentation_id);

    res.status(200).json(pool);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
