import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import elementGroup from "models/element_group.js"; // Usamos o model de grupo
import validator from "models/validator.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota PATCH (Atualizar Grupo) ---
router.patch(
  // Foco em Segurança:
  // Reutilizamos a permissão "update:element", pois atualizar o nome
  // de um grupo é parte da edição do mapa.
  authorization.canRequest("update:element"),
  groupIdValidator, // Valida o req.query.id
  patchHandler,
);

// --- Rota DELETE (Deletar Grupo) ---
router.delete(
  // Foco em Segurança:
  // Reutilizamos a permissão "delete:element".
  authorization.canRequest("delete:element"),
  groupIdValidator, // Valida o req.query.id
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Middleware para validar o ID do grupo na URL (req.query)
 */
function groupIdValidator(req, res, next) {
  // Usamos o validador 'id' genérico para o UUID
  req.query = validator({ id: req.query?.id }, { id: "required" });
  next();
}

/**
 * Handler para PATCH /api/v1/element_groups/[id]
 * Atualiza o 'display_name' ou 'assigned_user_id' de um grupo.
 */
async function patchHandler(req, res) {
  try {
    const { id: groupId } = req.query;

    // O model 'elementGroup.update' valida o body (display_name, assigned_user_id)
    // e cuida do 404 se o grupo não existir.
    const updatedGroup = await elementGroup.update(groupId, req.body);

    res.status(200).json(updatedGroup);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para DELETE /api/v1/element_groups/[id]
 * Deleta um grupo e (via CASCADE) todos os seus scene_elements.
 */
async function deleteHandler(req, res) {
  try {
    const { id: groupId } = req.query;

    // O model 'elementGroup.del' cuida do 404
    const deletedGroup = await elementGroup.del(groupId);

    res.status(200).json(deletedGroup);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
