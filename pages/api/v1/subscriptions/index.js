import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import validator from "models/validator.js";
import subscription from "models/subscription.js";
import { ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.post(
  authorization.canRequest("create:subscription"),
  postValidator,
  postHandler,
);

router.get(getCanRequestHandler, getHandler);

export default router.handler(controller.errorsHandlers);

function postValidator(req, res, next) {
  req.body = validator(req.body, {
    user_id: "required",
    plan_id: "required",
    discount_value: "optional",
    payment_day: "required",
    start_date: "required",
  });
  next();
}

async function postHandler(req, res) {
  try {
    const newSubscription = await subscription.create(req.body);
    const filteredOutput = authorization.filterOutput(
      req.context.user,
      "create:subscription",
      newSubscription,
    );
    res.status(201).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getCanRequestHandler(req, res, next) {
  try {
    const requestingUser = req.context.user;
    const targetUsername = req.query.username;

    // Se um user_id específico foi solicitado...
    if (targetUsername) {
      const isSelf =
        requestingUser.username.toUpperCase() === targetUsername.toUpperCase();
      const canReadOther = authorization.can(
        requestingUser,
        "read:subscription:other",
      );

      if (isSelf || canReadOther) return next();

      throw new ForbiddenError({
        message:
          "Você não tem permissão para visualizar as assinaturas deste usuário.",
      });
    }

    // Se NENHUM user_id foi solicitado (listar todos), apenas admins podem
    if (authorization.can(requestingUser, "read:subscription:other")) {
      return next();
    }

    throw new ForbiddenError({
      message: "Você não tem permissão para listar todas as assinaturas.",
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { username } = req.query;

    let subscriptions;
    if (username) {
      subscriptions = await subscription.findByUsername(username);
    } else {
      subscriptions = await subscription.findAll();
    }

    const feature =
      username &&
      req.context.user.username.toUpperCase() === username.toUpperCase()
        ? "read:subscription:self"
        : "read:subscription:other";
    const filteredOutput = subscriptions.map((sub) =>
      authorization.filterOutput(req.context.user, feature, sub),
    );

    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
