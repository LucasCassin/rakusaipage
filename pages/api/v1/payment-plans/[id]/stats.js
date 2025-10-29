import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import paymentPlan from "models/payment_plan.js";
import { NotFoundError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Protegido por permissão de leitura de assinaturas
router.get(authorization.canRequest("read:subscription:other"), getHandler);

export default router.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  try {
    const { id } = req.query;

    const plan = await paymentPlan.findById(id);
    if (!plan) {
      throw new NotFoundError({ message: "Plano não encontrado." });
    }

    const activeSubscriptions =
      await paymentPlan.findActiveSubscriptionCount(id);

    res.status(200).json({
      plan_id: id,
      activeSubscriptions: activeSubscriptions,
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
