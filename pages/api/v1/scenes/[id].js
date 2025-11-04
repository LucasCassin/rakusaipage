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

// Middleware para verificar se o usuário é o dono da cena
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { id: scene_id } = req.query;

  const scn = await scene.findById(scene_id);
  if (!scn) {
    throw new NotFoundError({ message: "Cena não encontrada." });
  }

  const pres = await presentation.findById(scn.presentation_id);
  if (pres.created_by_user_id !== user.id) {
    throw new ForbiddenError({
      message: "Você não tem permissão para modificar esta cena.",
    });
  }

  req.context.scene = scn; // Anexa a cena para o próximo handler
  next();
}

// --- Rota PATCH (Atualizar Cena) ---
router.patch(
  authorization.canRequest("update:presentation"),
  checkOwnership,
  patchHandler,
);

// --- Rota DELETE (Deletar Cena) ---
router.delete(
  authorization.canRequest("update:presentation"),
  checkOwnership,
  deleteHandler,
);

export default router.handler(controller.errorsHandlers);

async function patchHandler(req, res) {
  try {
    const { id: scene_id } = req.query;
    // O modelo 'scene.update' valida 'name', 'order', 'description'
    const updatedScene = await scene.update(scene_id, req.body);
    res.status(200).json(updatedScene);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function deleteHandler(req, res) {
  try {
    const { id: scene_id } = req.query;
    const deletedScene = await scene.del(scene_id);
    res.status(200).json(deletedScene);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
