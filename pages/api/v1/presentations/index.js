import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota GET (Listar) ---
// Protegida por "read:presentation:self" (a feature default)
router.get(authorization.canRequest("read:presentation:self"), getHandler);

// --- Rota POST (Criar) ---
// Protegida por "create:presentation" (feature de admin)
router.post(authorization.canRequest("create:presentation"), postHandler);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para GET /api/v1/presentations
 * Lista todas as apresentações que o usuário pode ver.
 */
async function getHandler(req, res) {
  try {
    const user = req.context.user;

    // A função do modelo já cuida da lógica de "criou OU é viewer"
    const presentations = await presentation.findAllForUser(user.id);

    // Filtra a saída (embora aqui 'self' e 'other' sejam parecidas)
    const filteredOutput = presentations.map((pres) =>
      authorization.filterOutput(user, "read:presentation:self", pres),
    );

    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

/**
 * Handler para POST /api/v1/presentations
 * Cria uma nova apresentação.
 */
async function postHandler(req, res) {
  try {
    const user = req.context.user;

    // 'presentation.create' já valida os dados do body
    const newPresentation = await presentation.create(req.body, user.id);

    // Filtra a saída
    const filteredOutput = authorization.filterOutput(
      user,
      "create:presentation", //
      newPresentation,
    );

    res.status(201).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
