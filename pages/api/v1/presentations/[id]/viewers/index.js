import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentationViewer from "models/presentation_viewer.js";
import validator from "models/validator.js";
// Erros e "presentation" não são mais necessários aqui,
// o canRequest e o modelo cuidam de tudo.

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota GET (Listar Elenco) ---
router.get(
  // A verificação de "dono" (checkOwnership) foi removida.
  // Agora apenas checa se o usuário tem a "chave" para ler o elenco.
  authorization.canRequest("read:viewer"),
  getHandler,
);

// --- Rota POST (Adicionar ao Elenco) ---
router.post(
  // A verificação de "dono" (checkOwnership) foi removida.
  // Agora apenas checa se o usuário tem a "chave" para criar um membro no elenco.
  authorization.canRequest("create:viewer"),
  patchValidator,
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

    // A permissão já foi validada pelo canRequest.
    const viewers =
      await presentationViewer.findByPresentationId(presentation_id);

    res.status(200).json(viewers);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function patchValidator(req, res, next) {
  req.body = validator(req.body, { user_id: "required" });
  next();
}

/**
 * Handler para POST /api/v1/presentations/[id]/viewers
 * Adiciona um usuário ao elenco.
 */
async function postHandler(req, res) {
  try {
    const { id: presentation_id } = req.query;
    const { user_id } = req.body; // Espera um body { "user_id": "..." }

    // A permissão já foi validada pelo canRequest.
    // O modelo 'addViewer' valida os dados e cuida do 404.
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
