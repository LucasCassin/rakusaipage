import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import tasks from "models/tasks.js";
// 1. Precisamos importar os erros
import { ForbiddenError, UnauthorizedError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// 2. Substitui o 'authorization.canRequest' pelo novo 'adminAuthCheck'
router.post(adminAuthCheck, postHandler);

export default router.handler(controller.errorsHandlers);

// --- 3. O NOVO MIDDLEWARE DE AUTENTICAÇÃO ---
async function adminAuthCheck(req, res, next) {
  const user = req.context.user;

  // 1. Verifica se o usuário é anônimo (não tem ID)
  if (!user.id) {
    throw new UnauthorizedError({ message: "Usuário não autenticado." });
  }

  // 2. Se tem ID, verifica se é admin (usando a mesma permissão de antes)
  const isAdmin = authorization.can(user, "create:migration");
  if (isAdmin) {
    return next(); // Autenticado, pode prosseguir
  }

  // 3. Se tem ID, mas não é admin
  throw new ForbiddenError({
    message: "Você não tem permissão para executar esta tarefa.",
  });
}
// --- FIM DO NOVO MIDDLEWARE ---

async function postHandler(req, res) {
  try {
    const summary = await tasks.runDailyTasks();
    res.status(200).json({
      message: "Tarefas diárias executadas com sucesso (via Admin).",
      summary,
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
