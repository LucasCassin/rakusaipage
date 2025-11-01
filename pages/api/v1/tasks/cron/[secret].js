import controller from "models/controller.js";
import tasks from "models/tasks.js";
import { ForbiddenError } from "errors/index.js";

export default async function handler(req, res) {
  try {
    // --- MUDANÇA AQUI ---
    // 1. Apenas o método GET é permitido
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }
    // --- FIM DA MUDANÇA ---

    // 2. Validação do Segredo (permanece igual)
    const { secret } = req.query;
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || secret !== cronSecret) {
      throw new ForbiddenError({ message: "Acesso negado." });
    }

    // 3. Executa as tarefas (permanece igual)
    const summary = await tasks.runDailyTasks();
    res.status(200).json({
      message: "Tarefas diárias executadas com sucesso (via Cron).",
      summary,
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
