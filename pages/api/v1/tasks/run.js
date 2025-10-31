import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import tasks from "models/tasks.js";
import { ForbiddenError, UnauthorizedError } from "errors/index.js";

const router = createRouter().use(authentication.injectAnonymousOrUser);

router.post(authCheck, postHandler);

export default router.handler(controller.errorsHandlers);

/**
 * Middleware de Autenticação Dupla (LÓGICA CORRIGIDA)
 */
async function authCheck(req, res, next) {
  // 1. Verificação do Cron Job (via Header Authorization)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    // Acesso via Cron Job (ignora o 'user' do cookie)
    return next();
  }

  // 2. Verificação de Usuário (via Cookie de Sessão)
  const user = req.context.user;

  // 3. CORREÇÃO: Verifica se o usuário é anônimo (sem ID)
  if (!user.id) {
    // Se não for Cron e não tiver ID, é um anônimo.
    throw new UnauthorizedError({ message: "Usuário não autenticado." });
  }

  // 4. O usuário está logado, verifica se é admin
  const isAdmin = authorization.can(user, "create:migration");
  if (isAdmin) {
    return next(); // Autenticado via Admin
  }

  // 5. O usuário está logado, mas não é admin
  throw new ForbiddenError({
    message: "Você não tem permissão para executar esta tarefa.",
  });
}

/**
 * Handler que executa as tarefas diárias.
 */
async function postHandler(req, res) {
  try {
    const summary = await tasks.runDailyTasks();
    res.status(200).json({
      message: "Tarefas diárias executadas com sucesso.",
      summary,
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
