import controller from "models/controller.js";
import tasks from "models/tasks.js";
import { ForbiddenError } from "errors/index.js";

export default async function handler(req, res) {
  try {
    // 1. Apenas o método GET é permitido
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }

    // 2. Validação do Segredo (lendo o HEADER)
    const cronSecretFromHeader = req.headers["x-vercel-cron-secret"];
    const cronSecretFromEnv = process.env.CRON_SECRET;

    // 3. Compara o header com a variável de ambiente
    if (!cronSecretFromHeader || cronSecretFromHeader !== cronSecretFromEnv) {
      throw new ForbiddenError({ message: "Acesso negado." });
    }

    // 4. Executa as tarefas (se os segredos baterem)
    const summary = await tasks.runDailyTasks();
    res.status(200).json({
      message: "Tarefas diárias executadas com sucesso (via Cron Header).",
      summary,
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
