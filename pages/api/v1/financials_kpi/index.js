import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import financials from "models/financials.js"; // Importa o novo modelo

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Protegendo a rota. O usuário precisa de AMBAS as permissões
// para ver o dashboard de KPIs completo, como você sugeriu.
router.get(
  authorization.canRequest("read:payment:other"),
  authorization.canRequest("read:subscription:other"),
  getHandler,
);

export default router.handler(controller.errorsHandlers);

/**
 * Handler que busca os KPIs agregados do dashboard.
 */
async function getHandler(req, res) {
  try {
    const kpiData = await financials.getDashboardKPIs();

    // Retorna os dados brutos (ex: { activeStudents: 2, revenueThisMonth: 100.00 })
    res.status(200).json(kpiData);
  } catch (error) {
    // Se algo der errado no modelo, o controller trata
    controller.errorsHandlers.onError(error, req, res);
  }
}
