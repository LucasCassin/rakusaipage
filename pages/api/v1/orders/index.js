import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import order from "models/order.js";

const router = createRouter();

router.use(authentication.injectAnonymousOrUser);

// Apenas admins com permissão podem listar todos os pedidos
router.get(
  authorization.canRequest("shop:orders:read_all"),
  async (req, res) => {
    try {
      const { limit, offset, status, search } = req.query;

      const result = await order.findAll({
        limit,
        offset,
        status,
        search,
      });

      res.status(200).json(result);
    } catch (error) {
      controller.errorsHandlers.onError(error, req, res);
    }
  },
);

export default router.handler(controller.errorsHandlers);
