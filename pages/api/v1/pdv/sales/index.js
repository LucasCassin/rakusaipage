import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import pdvSale from "models/pdv_sale.js";
import validator from "models/validator.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.post(
  authorization.canRequest("pdv:sell"),
  validateCreateBody,
  postHandler,
);

router.get(
  authorization.canRequest("pdv:reports:read"),
  validateGetQuery,
  getHandler,
);

export default router.handler(controller.errorsHandlers);

function validateCreateBody(req, res, next) {
  try {
    const body = req.body || {};

    req.cleanBody = validator(
      {
        pdv_sale_items: body.items,
        discount_type: body.discount_type,
        pdv_discount_value: body.discount_value,
        pdv_sale_payments: body.payments,
        notes: body.notes,
      },
      {
        pdv_sale_items: "required",
        discount_type: "optional",
        pdv_discount_value: "optional",
        pdv_sale_payments: "required",
        notes: "optional",
      },
    );

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function postHandler(req, res) {
  try {
    const sellerId = req.context.user.id;
    const body = req.cleanBody;

    const sale = await pdvSale.create({
      sellerId,
      items: body.pdv_sale_items,
      discountType: body.discount_type,
      discountValue: body.pdv_discount_value,
      payments: body.pdv_sale_payments,
      notes: body.notes,
    });

    res.status(201).json(sale);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateGetQuery(req, res, next) {
  try {
    const query = req.query || {};
    req.cleanQuery = validator(
      {
        limit: query.limit ? parseInt(query.limit) : 20,
        offset: query.offset ? parseInt(query.offset) : 0,
        user_id: query.seller_id,
      },
      { limit: "optional", offset: "optional", user_id: "optional" },
    );
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { limit, offset, user_id: sellerId } = req.cleanQuery;
    const result = await pdvSale.findAll({ limit, offset, sellerId });
    res.status(200).json(result);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
