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
  const targetUsername = req.query.username;

  if (targetUsername) {
    const isSelf =
      requestingUser.username.toUpperCase() === targetUsername.toUpperCase();
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
    const { username } = req.query;
    let payments;
    if (username) {
      payments = await payment.findByUsername(username);
    } else {
      payments = await payment.findAll();
    }

    const feature =
      username &&
      req.context.user.username.toUpperCase() === username.toUpperCase()
        ? "read:payment:self"
        : "read:payment:other";
    console.log(feature);
    const filteredOutput = payments.map((p) =>
      authorization.filterOutput(req.context.user, feature, p),
    );

    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
