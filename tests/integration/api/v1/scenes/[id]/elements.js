import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import scene from "models/scene.js";
import sceneElement from "models/scene_element.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Middleware para verificar se o usuário é o dono da cena
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { id: scene_id } = req.query; // Pega o ID da cena pela URL

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

  req.context.scene = scn;
  next();
}

// --- Rota POST (Criar Elemento) ---
router.post(
  authorization.canRequest("update:presentation"), // Usamos a permissão "pai"
  checkOwnership,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

async function postHandler(req, res) {
  try {
    const { id: scene_id } = req.query;

    // O body vindo do frontend já contém
    // element_type_id, position_x, position_y, display_name, etc.
    const newElement = await sceneElement.create({
      ...req.body,
      scene_id: scene_id, // Garante que o ID da cena está correto
    });

    res.status(201).json(newElement);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
