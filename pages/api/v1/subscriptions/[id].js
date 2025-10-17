import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import validator from "models/validator.js";
import subscription from "models/subscription.js";
import { NotFoundError, ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(getCanRequestHandler, getHandler);
router.patch(
  authorization.canRequest("update:subscription"),
  patchValidator,
  patchHandler,
);
router.delete(authorization.canRequest("delete:subscription"), deleteHandler);

export default router.handler(controller.errorsHandlers);

async function getCanRequestHandler(req, res, next) {
  const requestingUser = req.context.user;
  const subscriptionToCheck = await subscription.findById(req.query.id);
  if (!subscriptionToCheck)
    throw new NotFoundError({ message: "Assinatura não encontrada." });

  req.context.subscription = subscriptionToCheck;

  const canReadSelf = authorization.can(
    requestingUser,
    "read:subscription:self",
    subscriptionToCheck,
  );
  const canReadOther = authorization.can(
    requestingUser,
    "read:subscription:other",
  );

  if (canReadSelf || canReadOther) return next();

  throw new ForbiddenError({
    message: "Você não tem permissão para visualizar esta assinatura.",
  });
}

async function getHandler(req, res) {
  try {
    const feature =
      req.context.user.id === req.context.subscription.user_id
        ? "read:subscription:self"
        : "read:subscription:other";
    const filteredOutput = authorization.filterOutput(
      req.context.user,
      feature,
      req.context.subscription,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function patchValidator(req, res, next) {
  req.body = validator(req.body, {
    discount_value: "optional",
    is_active: "optional",
  });
  next();
}

async function patchHandler(req, res) {
  try {
    const updatedSub = await subscription.update(req.query.id, req.body);
    const filteredOutput = authorization.filterOutput(
      req.context.user,
      "update:subscription",
      updatedSub,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function deleteHandler(req, res) {
  try {
    const deletedSub = await subscription.del(req.query.id);
    const filteredOutput = authorization.filterOutput(
      req.context.user,
      "delete:subscription",
      deletedSub,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
