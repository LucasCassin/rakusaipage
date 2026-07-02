import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import pdvSale from "models/pdv_sale.js";
import validator from "models/validator.js";
import { ForbiddenError } from "errors/index.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired)
  .use(authorization.canRequestAny(["pdv:reports:read", "pdv:sell"]));

router.get(validateGetQuery, getHandler);

export default router.handler(controller.errorsHandlers);

function validateGetQuery(req, res, next) {
  try {
    const { id } = req.query;
    req.cleanQuery = validator({ id }, { id: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const user = req.context.user;

    const sale = await pdvSale.findById(id);

    const hasFullReportAccess = user.features.includes("pdv:reports:read");
    if (!hasFullReportAccess && !authorization.can(user, "pdv:sell", sale)) {
      throw new ForbiddenError({
        message: "Você só pode visualizar as vendas que você mesmo realizou.",
      });
    }

    res.status(200).json(sale);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
