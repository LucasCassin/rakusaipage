import { createRouter } from "next-connect";
import controller from "models/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import order from "models/order.js";
import { ForbiddenError } from "errors/index.js";

const router = createRouter()
  .use(authentication.injectAnonymousOrUser)
  .use(authentication.checkIfUserPasswordExpired);

router.get(getHandler);

export default router.handler(controller.errorsHandlers);

async function getHandler(req, res) {
  try {
    const { id } = req.query;
    const user = req.context.user;
    const isAdmin = authorization.can(user, "shop:orders:read_all");

    let foundOrder;
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );

    // 1. Estratégia de Busca
    if (isUuid) {
      foundOrder = await order.findById(id);
    } else {
      foundOrder = await order.findByCode(id);
    }

    // 2. Verificação de Permissão
    const isOwner = user.id === foundOrder.user_id;
    const canViewFull = isAdmin || isOwner;

    if (canViewFull) {
      // Admin ou Dono: Vê tudo
      return res.status(200).json(foundOrder);
    }

    // 3. Modo Público (Rastreio)
    // Só permitido se buscou pelo CÓDIGO (UUID é restrito para evitar varredura)
    if (!isUuid) {
      // Retorna objeto Sanitizado (Sem dados sensíveis)
      const publicOrder = {
        code: foundOrder.code,
        status: foundOrder.status,
        created_at: foundOrder.created_at,
        updated_at: foundOrder.updated_at,
        tracking_code: foundOrder.tracking_code,
        tracking_history: foundOrder.tracking_history,
        shipping_method: foundOrder.shipping_method,
        // Resumo dos itens (sem preço total do pedido para privacidade)
        items: foundOrder.items.map((item) => ({
          product_name: item.product_name_snapshot,
          quantity: item.quantity,
        })),
        // Não retorna: user_id, address completo, totals financeiros, gateway data
      };
      return res.status(200).json(publicOrder);
    }

    // Se tentou acessar por UUID sem ser dono/admin: Proibido
    throw new ForbiddenError({
      message: "Você não tem permissão para visualizar este pedido.",
    });
  } catch (error) {
    controller.errorsHandlers.onError(error, req, res);
  }
}
