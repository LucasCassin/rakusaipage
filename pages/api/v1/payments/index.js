import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import payment from "models/payment.js";
import { ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(getCanRequestHandler, getHandler);

export default router.handler(controller.errorsHandlers);

async function getCanRequestHandler(req, res, next) {
  const requestingUser = req.context.user;
  const targetUserId = req.query.user_id;

  if (targetUserId) {
    const isSelf = requestingUser.id === targetUserId;
    if (isSelf) return next();

    if (authorization.can(requestingUser, "read:payment:other")) return next();

    throw new ForbiddenError({
      message:
        "Você não tem permissão para visualizar os pagamentos deste usuário.",
    });
  }

  if (authorization.can(requestingUser, "read:payment:other")) {
    return next();
  }

  throw new ForbiddenError({
    message: "Você não tem permissão para listar todos os pagamentos.",
  });
}

async function getHandler(req, res) {
  try {
    const { user_id } = req.query;

    let payments;
    if (user_id) {
      payments = await payment.findByUserId(user_id);
    } else {
      payments = await payment.findAll();
    }

    const feature =
      user_id && req.context.user.id === user_id
        ? "read:payment:self"
        : "read:payment:other";
    const filteredOutput = payments.map((p) =>
      authorization.filterOutput(req.context.user, feature, p),
    );

    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
