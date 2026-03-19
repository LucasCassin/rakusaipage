import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import payment from "models/payment.js";
import user from "models/user.js";
import paymentGateway from "services/payment-gateway.js";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired)
  .use(authorization.canRequest("read:payment:self"));

router.post(postHandler);

export default router.handler(controller.errorsHandlers);

async function postHandler(req, res) {
  try {
    const { id: paymentId } = req.query;
    const requestingUser = req.context.user;

    const targetPayment = await payment.findById(paymentId);
    if (!targetPayment) {
      throw new NotFoundError({ message: "Pagamento não encontrado." });
    }

    if (
      !authorization.can(requestingUser, "read:payment:self", targetPayment)
    ) {
      if (
        !authorization.can(requestingUser, "read:payment:other", targetPayment)
      ) {
        throw new ForbiddenError({
          message: "Você não tem permissão para acessar este pagamento.",
        });
      }
    }

    if (targetPayment.status !== "PENDING") {
      throw new ValidationError({
        message: "Somente pagamentos pendentes podem gerar PIX.",
      });
    }

    const targetUser = await user.findOneUser({ id: targetPayment.user_id });
    if (!targetUser || !targetUser.email || !targetUser.username) {
      throw new ValidationError({
        message:
          "Usuário do pagamento não possui dados completos para gerar PIX.",
      });
    }

    const pixPayload = await paymentGateway.createPixPayment(
      {
        id: targetPayment.id,
        total_in_cents: Math.round(Number(targetPayment.amount_due) * 100),
      },
      {
        email: targetUser.email,
        username: targetUser.username,
      },
    );

    const updatedPayment = await payment.updateGatewayInfo(targetPayment.id, {
      gatewayId: pixPayload.gateway_id,
      gatewayStatus: pixPayload.status,
      gatewayData: pixPayload,
    });

    res.status(200).json({ payment: updatedPayment, pix: pixPayload });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
