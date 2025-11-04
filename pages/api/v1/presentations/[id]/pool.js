import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
// Erros não são mais necessários aqui

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota GET (Buscar o Pool) ---
router.get(
  // Verificação de "dono" removida.
  // Se o usuário pode "atualizar" a apresentação, ele pode ver o pool de elementos.
  authorization.canRequest("update:presentation"),
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

    // A permissão já foi validada.
    const pool = await presentation.findElementPool(presentation_id);

    res.status(200).json(pool);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
