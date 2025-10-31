import controller from "models/controller.js";
import tasks from "models/tasks.js";
import { ForbiddenError } from "errors/index.js";

// Nota: Não usamos 'next-connect' ou 'authentication' aqui
// para manter a rota o mais leve possível para o cron.

export default async function handler(req, res) {
  try {
    // 1. Apenas o método POST é permitido
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }

    // 2. Validação do Segredo
    const { secret } = req.query;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || secret !== cronSecret) {
      // Usamos ForbiddenError (403) para não vazar a existência da rota
      throw new ForbiddenError({ message: "Acesso negado." });
    }

    // 3. Executa as tarefas
    const summary = await tasks.runDailyTasks();
    res.status(200).json({
      message: "Tarefas diárias executadas com sucesso (via Cron).",
      summary,
    });
  } catch (error) {
    // Reutiliza o seu error handler, mas o chama manualmente
    controller.errorsHandlers.onError(error, req, res);
  }
}
