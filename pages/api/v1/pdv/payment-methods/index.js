import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import pdvPaymentMethod from "models/pdv_payment_method.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(
  authorization.canRequestAny(["pdv:sell", "pdv:payment_methods:manage"]),
  getHandler,
);

export default router.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  try {
    const userFeatures = req.context?.user?.features || [];
    const isAdmin = userFeatures.includes("pdv:payment_methods:manage");

    const result = await pdvPaymentMethod.findAll({
      includeInactive: isAdmin && req.query.include_inactive === "true",
    });
    res.status(200).json(result);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
