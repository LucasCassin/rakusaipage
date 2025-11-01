import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import financials from "models/financials.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(
  authorization.canRequest("read:payment:other"),
  authorization.canRequest("read:subscription:other"),
  getHandler,
);

export default router.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  try {
    // --- ATUALIZAÇÃO ---
    // Lê os novos parâmetros 'startDate' e 'endDate'
    const { startDate, endDate } = req.query;

    // Passa os parâmetros (que podem ser undefined) para o modelo.
    const kpiData = await financials.getDashboardKPIs(startDate, endDate);
    // --- FIM DA ATUALIZAÇÃO ---

    res.status(200).json(kpiData);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
