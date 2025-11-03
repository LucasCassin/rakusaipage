import controller from "models/controller.js";
import tasks from "models/tasks.js";
import { UnauthorizedError } from "errors/index.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ message: "Method Not Allowed" });
    }

    // --- LÓGICA DE AUTENTICAÇÃO CORRIGIDA ---

    // 2. Lê o cabeçalho 'authorization' como um objeto
    const authHeader = req.headers["authorization"]; // Correção aqui

    // 3. Compara com o 'Bearer' + segredo do ambiente
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      throw new UnauthorizedError({ message: "Acesso não autorizado." });
    }
    // --- FIM DA CORREÇÃO ---

    // 5. Executa as tarefas
    const summary = await tasks.runDailyTasks();
    res.status(200).json({
      message: "Tarefas diárias executadas com sucesso (via Cron Header).",
      summary,
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
