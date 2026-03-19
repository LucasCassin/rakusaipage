import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import coupon from "models/coupon.js";
import validator from "models/validator.js";

const router = createRouter();

router
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired)
  .use(authorization.canRequest("shop:coupons:manage"));

router.get(validateGetQuery, getHandler);
router.post(validateCouponBody, postHandler);

export default router.handler(controller.errorsHandlers);

function validateGetQuery(req, res, next) {
  try {
    const query = req.query || {};
    const preparedQuery = {
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
    };

    req.cleanQuery = validator(preparedQuery, {
      limit: "optional",
      offset: "optional",
    });

    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function getHandler(req, res) {
  try {
    const { limit, offset } = req.cleanQuery;
    const result = await coupon.findAll({ limit, offset });
    res.status(200).json(result);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateCouponBody(req, res, next) {
  try {
    const body = req.body || {};

    // Mapeia 'type' para 'coupon_type' para passar na validação do Joi (validator.js)
    const dataToValidate = { ...body };
    if (dataToValidate.type) {
      dataToValidate.coupon_type = dataToValidate.type;
    }

    const validatedData = validator(dataToValidate, {
      code: "required",
      description: "required",
      discount_percentage: "required",
      min_purchase_value_in_cents: "optional",
      usage_limit_global: "optional",
      usage_limit_per_user: "optional",
      expiration_date: "optional",
      is_active: "optional",
      is_cumulative: "optional",
      coupon_type: "optional",
      max_discount_in_cents: "optional",
    });

    // Restaura 'type' para ser usado no model.create
    if (validatedData.coupon_type) {
      validatedData.type = validatedData.coupon_type;
      delete validatedData.coupon_type;
    }

    req.cleanBody = validatedData;
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function postHandler(req, res) {
  try {
    const newCoupon = await coupon.create(req.cleanBody);
    res.status(201).json(newCoupon);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
