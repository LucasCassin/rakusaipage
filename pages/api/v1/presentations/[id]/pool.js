import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import validator from "models/validator.js";
// Erros não são mais necessários aqui

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota GET (Buscar o Pool) ---
router.get(
  authorization.canRequest("update:presentation"),
  presentationIdValidator,
  getHandler,
);

export default router.handler(controller.errorsHandlers);

function presentationIdValidator(req, res, next) {
  req.query = validator(
    { presentation_id: req.query?.id },
    { presentation_id: "required" },
  );
  next();
}

/**
 * Handler para GET /api/v1/presentations/[id]/pool
 * Busca os "elementos pré-fabricados" (o Pool) para a paleta.
 */
async function getHandler(req, res) {
  try {
    const { presentation_id } = req.query;

    // A permissão já foi validada.
    const pool = await presentation.findElementPool(presentation_id);

    res.status(200).json(pool);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
