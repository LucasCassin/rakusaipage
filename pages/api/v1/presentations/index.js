import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import { UnauthorizedError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Rota GET (Listar Apresentações do Usuário) ---
router.get(async (req, res, next) => {
  if (!req.context.user.id) {
    throw new UnauthorizedError({ message: "Usuário não autenticado." });
  }
  next();
}, getHandler);

// --- Rota POST (Criar) ---
router.post(authorization.canRequest("create:presentation"), postHandler);

export default router.handler(controller.errorsHandlers);

/**
 * Handler para GET /api/v1/presentations
 * Lista as apresentações que o usuário criou ou que ele está no elenco.
 */
async function getHandler(req, res) {
  try {
    const user = req.context.user;
    let presentations = [];

    if (authorization.can(user, "read:presentation:admin")) {
      presentations = await presentation.findAll();
    } else {
      presentations = await presentation.findAllActiveByUserId(user.id);
    }

    // Filtra a saída usando a "chave" de leitura padrão
    const filteredOutput = presentations.map((pres) =>
      authorization.filterOutput(user, "read:presentation", pres),
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
    const newPresentation = await presentation.create(req.body, user.id);

    // Filtra a saída usando a "chave" de criação
    const filteredOutput = authorization.filterOutput(
      user,
      "create:presentation",
      newPresentation,
    );
    res.status(201).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
