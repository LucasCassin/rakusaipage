import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import validator from "models/validator";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota PATCH (Reordenar Cenas) ---
router.patch(
  // Usa a mesma permissão de atualizar a apresentação
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
  console.log("Validando ID da cena...");
  req.body = validator(
    { scene_ids: req.body?.scene_ids },
    { scene_ids: "required" },
  );
  next();
}

async function patchHandler(req, res) {
  try {
    const { presentation_id } = req.query;
    const { scene_ids } = req.body;

    await presentation.reorderScenes(presentation_id, scene_ids);

    res.status(200).json({ message: "Ordem das cenas atualizada." });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
