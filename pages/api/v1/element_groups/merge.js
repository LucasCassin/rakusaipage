import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import elementGroup from "models/element_group.js"; // Importamos o novo model
import validator from "models/validator.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota POST (Fundir Grupos) ---
router.post(
  // Foco em Segurança:
  // Reutilizamos a permissão "update:element", pois agrupar é
  // uma forma de atualização da estrutura dos elementos no palco.
  authorization.canRequest("update:element"),
  validateMergeBody, // Middleware de validação do body
  postHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Middleware de validação para o corpo (body) do request de merge.
 */
function validateMergeBody(req, res, next) {
  // Agora validamos usando os schemas específicos que acabamos de criar
  req.body = validator(req.body, {
    targetGroupId: "required",
    sourceGroupId: "required",
  });
  next();
}

/**
 * Handler para POST /api/v1/element_groups/merge
 * Funde dois grupos de elementos.
 */
async function postHandler(req, res) {
  try {
    const { targetGroupId, sourceGroupId } = req.body;

    // A lógica de transação complexa está no model.
    // O controller apenas orquestra a chamada.
    const mergeResult = await elementGroup.merge(targetGroupId, sourceGroupId);

    // Retorna o resultado (ex: { elements_moved: 2 })
    res.status(200).json(mergeResult);
  } catch (error) {
    // O handler de erro do controller.js cuida de
    // ServiceErrors (ex: 400 se targetId == sourceId)
    // NotFoundErrors, etc.
    controller.errorsHandlers.onError(error, req, res);
  }
}
