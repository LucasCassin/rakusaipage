import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import pdvSalesReport from "models/pdv_sales_report.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(authorization.canRequest("pdv:reports:read"), getHandler);

export default router.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  try {
    const query = req.query || {};

    const productIds = Array.isArray(query.product_ids)
      ? query.product_ids
      : typeof query.product_ids === "string"
        ? query.product_ids.split(",").filter(Boolean)
        : undefined;

    const report = await pdvSalesReport.getReport({
      productIds,
      startDate: query.start_date,
      endDate: query.end_date,
      paymentMethodId: query.payment_method_id,
      paymentMethodVariantId: query.payment_method_variant_id,
      sellerId: query.seller_id,
      includeCancelled: query.include_cancelled === "true",
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    res.status(200).json(report);
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
