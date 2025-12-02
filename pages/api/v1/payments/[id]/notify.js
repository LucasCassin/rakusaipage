import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import payment from "models/payment.js";
import user from "models/user.js";
import plan from "models/payment_plan.js";
import subscription from "models/subscription.js";
import { emailService } from "services/emailService.js";
import { NotFoundError, ValidationError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.post(
  authorization.canRequest("update:payment:confirm_paid"),
  postHandler,
);

export default router.handler(controller.errorsHandlers);

async function postHandler(req, res) {
  try {
    const { id } = req.query;

    // 1. Buscas no Banco de Dados
    const targetPayment = await payment.findById(id);
    if (!targetPayment) {
      throw new NotFoundError({ message: "Pagamento não encontrado." });
    }
    if (targetPayment.status === "CONFIRMED") {
      throw new ValidationError({
        message: "Não é possível notificar um pagamento já realizado.",
      });
    }

    const targetSubscription = await subscription.findById(
      targetPayment.subscription_id,
    );
    if (!targetSubscription) {
      throw new NotFoundError({
        message: "Assinatura vinculada não encontrada.",
      });
    }

    const targetUser = await user.findOneUser({
      id: targetSubscription.user_id,
    });
    if (!targetUser || !targetUser.email) {
      throw new ValidationError({
        message: "Usuário não encontrado ou sem e-mail cadastrado.",
      });
    }

    const targetPlan = await plan.findById(targetSubscription.plan_id);

    const isOverdue = targetPayment.status === "OVERDUE";

    const formattedDate = new Date(targetPayment.due_date).toLocaleDateString(
      "pt-BR",
      {
        timeZone: "UTC",
      },
    );

    const baseUrl =
      process.env.NEXT_PUBLIC_WEBSERVER_URL || "https://rakusaitaiko.com.br";
    const link = `${baseUrl}/financeiro`;

    // 3. Chamada ao Serviço de Email
    await emailService.sendPaymentWarning({
      to: targetUser.email,
      username: targetUser.username,
      planName: targetPlan?.name || "Plano Rakusai",
      amount: targetPayment.amount_due,
      dueDate: formattedDate,
      paymentLink: link,
      isOverdue: isOverdue,
    });

    res.status(200).json({ message: "Notificação enviada com sucesso." });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
