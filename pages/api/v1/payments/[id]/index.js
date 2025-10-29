import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import payment from "models/payment.js";
import validator from "models/validator.js"; // Importar o validador
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.patch(patchValidator, patchHandler);

export default router.handler(controller.errorsHandlers);

/**
 * Valida o corpo (body) da requisição PATCH.
 * Espera um objeto com a propriedade "action".
 */
function patchValidator(req, res, next) {
  req.body = validator(req.body, {
    action: "required",
  });
  next();
}

/**
 * Handler para atualizar o status de um pagamento.
 * Ele verifica a permissão *internamente* com base na ação.
 */
async function patchHandler(req, res) {
  try {
    const { id: paymentId } = req.query;
    const { action } = req.body;
    const user = req.context.user;

    let updatedPayment;

    switch (action) {
      case "confirm_paid":
        // 1. O admin quer confirmar o pagamento
        // Verificamos se o usuário tem a permissão para *esta* ação
        if (!authorization.can(user, "update:payment:confirm_paid")) {
          throw new ForbiddenError({
            message: "Você não tem permissão para confirmar pagamentos.",
          });
        }
        updatedPayment = await payment.adminConfirmPaid(paymentId);
        break;

      case "indicate_paid":
        // 2. O usuário quer indicar que pagou
        // Verificamos a permissão
        if (!authorization.can(user, "update:payment:indicate_paid")) {
          throw new ForbiddenError({
            message: "Você não tem permissão para indicar pagamentos.",
          });
        }
        // O modelo 'payment.userIndicatePaid' já verifica se o
        // usuário é o dono do pagamento
        updatedPayment = await payment.userIndicatePaid(paymentId, user.id);
        break;

      default:
        // 3. Ação desconhecida
        throw new NotFoundError({
          message: `A ação "${action}" não é válida.`,
        });
    }

    res.status(200).json(updatedPayment);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
