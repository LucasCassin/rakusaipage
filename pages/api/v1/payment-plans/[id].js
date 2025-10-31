import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import validator from "models/validator.js";
import paymentPlan from "models/payment_plan.js";
import { NotFoundError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

// GET para buscar um plano por ID
router.get(authorization.canRequest("read:payment_plan"), getHandler);

// PATCH para atualizar um plano por ID
router.patch(
  authorization.canRequest("update:payment_plan"),
  patchValidator,
  patchHandler,
);

// DELETE para apagar um plano por ID
router.delete(authorization.canRequest("delete:payment_plan"), deleteHandler);

export default router.handler(controller.errorsHandlers);

// --- Handlers do GET ---
async function getHandler(req, res) {
  try {
    const { id } = req.query;
    const plan = await paymentPlan.findById(id);
    if (!plan) {
      throw new NotFoundError({ message: "Plano não encontrado." });
    }

    const filteredOutput = authorization.filterOutput(
      req.context.user,
      "read:payment_plan",
      plan,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

// --- Handlers do PATCH ---
function patchValidator(req, res, next) {
  req.body = validator(req.body, {
    name: "optional",
    description: "optional",
    full_value: "optional",
    period_unit: "optional",
    period_value: "optional",
  });
  next();
}
async function patchHandler(req, res) {
  try {
    const { id } = req.query;
    const updatedPlan = await paymentPlan.update(id, req.body);
    if (!updatedPlan) {
      throw new NotFoundError({
        message: "Plano não encontrado para atualização.",
      });
    }

    const filteredOutput = authorization.filterOutput(
      req.context.user,
      "update:payment_plan",
      updatedPlan,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

// --- Handler do DELETE ---
async function deleteHandler(req, res) {
  try {
    const { id } = req.query;
    console.log("Vou tentar excluir, id: ", id);
    const deletedPlan = await paymentPlan.del(id);
    if (!deletedPlan) {
      throw new NotFoundError({
        message: "Plano não encontrado para deleção.",
      });
    }

    const filteredOutput = authorization.filterOutput(
      req.context.user,
      "delete:payment_plan",
      deletedPlan,
    );
    res.status(200).json(filteredOutput);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
