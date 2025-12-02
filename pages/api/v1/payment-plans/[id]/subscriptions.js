import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import subscription from "models/subscription.js";
import plan from "models/payment_plan.js";
import { NotFoundError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// Protegido por permissão de leitura de planos de pagamento
router.get(authorization.canRequest("read:subscription:other"), getHandler);

export default router.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  const { id } = req.query;

  // Verifica se o plano existe antes de buscar as assinaturas
  const associatedPlan = await plan.findById(id);
  if (!associatedPlan) {
    throw new NotFoundError({ message: "Plano de pagamento não encontrado." });
  }

  const subscriptions = await subscription.findByPlanId(id);
  const filteredOutput = subscriptions.map((sub) =>
    authorization.filterOutput(
      req.context.user,
      "read:subscription:other",
      sub,
    ),
  );

  res.status(200).json(filteredOutput);
}
