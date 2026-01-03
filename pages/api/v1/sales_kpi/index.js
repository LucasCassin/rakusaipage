import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import salesAnalytics from "models/sales_analytics.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(
  authorization.canRequest("shop:orders:read_all"), // Reutilizando feature existente
  getHandler,
);

export default router.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  try {
    const { start_date, end_date } = req.query;

    const kpis = await salesAnalytics.getKPIs({
      startDate: start_date,
      endDate: end_date,
    });

    res.status(200).json(kpis);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
