import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import validator from "models/validator.js";
// Erros não são mais necessários aqui, pois o canRequest cuida do 403
// e o modelo cuida do 404.

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota PATCH (Edição Global) ---
router.patch(
  authorization.canRequest("update:presentation"),
  presentationIdValidator,
  patchHandler,
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
 * Handler para PATCH /api/v1/presentations/[id]/element-names
 * Atualiza um 'display_name' e 'assigned_user_id' em todas as cenas.
 */
async function patchHandler(req, res) {
  try {
    const { presentation_id } = req.query;

    // O canRequest() já validou a permissão.
    // O modelo 'updateElementGlobally' valida o req.body e cuida do 404.
    const result = await presentation.updateElementGlobally(
      presentation_id,
      req.body,
    );

    res.status(200).json(result); // Retorna { updatedCount: X }
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
