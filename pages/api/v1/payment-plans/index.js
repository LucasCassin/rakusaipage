import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import validator from "models/validator.js";
import paymentPlan from "models/payment_plan.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.post(
  authorization.canRequest("create:payment_plan"),
  postValidator,
  postHandler,
);

router.get(authorization.canRequest("read:payment_plan"), getHandler);

export default router.handler(controller.errorsHandlers);

function postValidator(req, res, next) {
  req.body = validator(req.body, {
    name: "required",
    description: "optional",
    full_value: "required",
    period_unit: "required",
    period_value: "required",
  });
  next();
}

async function postHandler(req, res) {
  try {
    const newPlan = await paymentPlan.create(req.body);

    // A feature 'create:payment_plan' também dá permissão para ler o resultado.
    const filteredOutput = authorization.filterOutput(
      req.context.user,
      "create:payment_plan",
      newPlan,
    );

    res.status(201).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const plans = await paymentPlan.findAll();
    const filteredOutput = plans.map((plan) =>
      authorization.filterOutput(req.context.user, "read:payment_plan", plan),
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
