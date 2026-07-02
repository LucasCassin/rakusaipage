import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import pdvSale from "models/pdv_sale.js";
import validator from "models/validator.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired)
  .use(authorization.canRequest("pdv:sales:cancel"));

router.post(validateCancelInput, postHandler);

export default router.handler(controller.errorsHandlers);

function validateCancelInput(req, res, next) {
  try {
    const { id } = req.query;
    const body = req.body || {};

    req.cleanQuery = validator({ id }, { id: "required" });

    // O motivo é opcional e pode estar totalmente ausente do body — nesse caso
    // não passamos pelo validator genérico, já que um objeto vazio sempre
    // falha na regra "min(1) chave" do schema padrão.
    req.cleanBody = {
      cancel_reason:
        body.reason !== undefined
          ? validator(
              { cancel_reason: body.reason },
              { cancel_reason: "optional" },
            ).cancel_reason
          : null,
    };
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function postHandler(req, res) {
  try {
    const { id } = req.cleanQuery;
    const cancelledByUserId = req.context.user.id;
    const { cancel_reason: reason } = req.cleanBody;

    const cancelledSale = await pdvSale.cancel(id, cancelledByUserId, reason);
    res.status(200).json(cancelledSale);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
