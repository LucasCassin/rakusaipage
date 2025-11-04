import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import presentation from "models/presentation.js";
import { ForbiddenError, UnauthorizedError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// --- Middleware de Auth (CORRIGIDO) ---
// Middleware para rotas GET (Listar)
async function getAuthCheck(req, res, next) {
  const user = req.context.user;
  // CORREÇÃO: A rota de listagem só precisa saber se o usuário está logado.
  // O modelo 'findAllForUser' já cuida da lógica de "o que" ele pode ver.
  if (!user.id) {
    throw new UnauthorizedError({ message: "Usuário não autenticado." });
  }
  // Se ele está logado (tem 'id'), ele tem permissão para listar (mesmo que a lista venha vazia).
  next();
}

// Middleware para rotas POST (Criar)
async function postAuthCheck(req, res, next) {
  const user = req.context.user;
  if (!user.id) {
    throw new UnauthorizedError({ message: "Usuário não autenticado." });
  }
  if (!authorization.can(user, "create:presentation")) {
    throw new ForbiddenError({
      message: "Você não tem permissão para criar apresentações.",
    });
  }
  next();
}

// --- Rota GET (Listar) ---
router.get(
  getAuthCheck, // <-- Usa o middleware corrigido
  getHandler,
);

// --- Rota POST (Criar) ---
router.post(postAuthCheck, postHandler);

export default router.handler(controller.errorsHandlers);

// ... (getHandler e postHandler permanecem os mesmos) ...
async function getHandler(req, res) {
  try {
    const user = req.context.user;
    const presentations = await presentation.findAllForUser(user.id);
    const filteredOutput = presentations.map((pres) =>
      authorization.filterOutput(user, "read:presentation:self", pres),
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function postHandler(req, res) {
  try {
    const user = req.context.user;
    const newPresentation = await presentation.create(req.body, user.id);
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
