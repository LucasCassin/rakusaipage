import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import presentationViewer from "models/presentation_viewer.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Middleware de autorização (para ambas as rotas)
// Verifica se o usuário logado é o criador da apresentação
async function checkOwnership(req, res, next) {
  const user = req.context.user;
  const { id: presentation_id } = req.query;

  const pres = await presentation.findById(presentation_id);
  if (!pres) {
    throw new NotFoundError({ message: "Apresentação não encontrada." });
  }

  // Apenas o criador da apresentação pode gerenciar o elenco
  if (pres.created_by_user_id !== user.id) {
    throw new ForbiddenError({
      message:
        "Você não tem permissão para gerenciar o elenco desta apresentação.",
    });
  }

  // Anexa a apresentação ao request para não buscar de novo
  req.context.presentation = pres;
  next();
}

// --- Rota GET (Listar Elenco) ---
router.get(
  authorization.canRequest("manage:presentation_viewers"), //
  checkOwnership,
  getHandler,
);

// --- Rota POST (Adicionar ao Elenco) ---
router.post(
  authorization.canRequest("manage:presentation_viewers"), //
  checkOwnership,
  postHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para GET /api/v1/presentations/[id]/viewers
 * Lista todos os usuários no elenco.
 */
async function getHandler(req, res) {
  try {
    const { id: presentation_id } = req.query;

    // O modelo já retorna os dados do usuário (id, username)
    const viewers =
      await presentationViewer.findByPresentationId(presentation_id);

    res.status(200).json(viewers);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para POST /api/v1/presentations/[id]/viewers
 * Adiciona um usuário ao elenco.
 */
async function postHandler(req, res) {
  try {
    const { id: presentation_id } = req.query;
    const { user_id } = req.body; // Espera um body { "user_id": "..." }

    // O modelo 'addViewer' valida os dados
    const newViewer = await presentationViewer.addViewer(
      presentation_id,
      user_id,
    );

    if (!newViewer) {
      // O 'ON CONFLICT DO NOTHING' retornou nada,
      // o que significa que o usuário já estava no elenco.
      return res.status(200).json({ message: "Usuário já estava no elenco." });
    }

    res.status(201).json(newViewer);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
