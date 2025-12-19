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

router.put(validateUpdateInput, putHandler);
router.delete(validateDeleteInput, deleteHandler);

export default router.handler(controller.errorsHandlers);

function validateUpdateInput(req, res, next) {
  try {
    const { id } = req.query;
    const body = req.body || {};

    validator({ id }, { id: "required" });

    const dataToValidate = { ...body };
    if (dataToValidate.type) {
      dataToValidate.coupon_type = dataToValidate.type;
    }

    const validatedData = validator(dataToValidate, {
      code: "optional",
      description: "optional",
      discount_percentage: "optional",
      min_purchase_value_in_cents: "optional",
      usage_limit_global: "optional",
      usage_limit_per_user: "optional",
      expiration_date: "optional",
      is_active: "optional",
      is_cumulative: "optional",
      coupon_type: "optional",
      max_discount_in_cents: "optional",
    });

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

async function putHandler(req, res) {
  try {
    const { id } = req.query;
    const updatedCoupon = await coupon.update(id, req.cleanBody);
    res.status(200).json(updatedCoupon);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

function validateDeleteInput(req, res, next) {
  try {
    const { id } = req.query;
    validator({ id }, { id: "required" });
    next();
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}

async function deleteHandler(req, res) {
  try {
    const { id } = req.query;
    // Soft delete: apenas desativa o cupom
    const deletedCoupon = await coupon.update(id, { is_active: false });
    res.status(200).json(deletedCoupon);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
