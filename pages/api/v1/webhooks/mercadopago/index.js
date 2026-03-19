import { createRouter } from "next-connect";
import controller from "models/controller.js";
import order from "models/order.js";
import paymentGateway from "services/payment-gateway.js";

const router = createRouter();

// Webhooks são públicos (o MP não manda cookie de sessão),
// mas devem ser validados verificando a assinatura ou consultando o pagamento na fonte.
router.post(webhookHandler);

export default router.handler(controller.errorsHandlers);

async function webhookHandler(req, res) {
  // O Mercado Pago envia o ID do pagamento na query (?id=...) ou no body ({ data: { id: ... } })
  // Depende da versão da API, vamos cobrir ambos.
  const queryId = req.query.id || req.query["data.id"];
  const bodyId = req.body?.data?.id;
  const paymentId = queryId || bodyId;
  const type = req.body?.type || req.query.topic;

  // Se não for evento de pagamento, ignoramos (retornamos 200 para o MP parar de mandar)
  if (type !== "payment" || !paymentId) {
    return res.status(200).send("Ignored");
  }

  try {
    // 1. SEGURANÇA: Nunca confie apenas no payload.
    // Vá no Mercado Pago e pergunte o status real desse ID.
    const paymentStatus = await paymentGateway.getPaymentStatus(paymentId);

    if (paymentStatus) {
      // 2. Busca o pedido pelo external_reference (que é o nosso order.id)
      const orderId = paymentStatus.external_reference;

      // 3. Atualiza o status no nosso banco
      // Mapeamos status do MP para o nosso sistema
      let newStatus = null;
      if (paymentStatus.status === "approved") newStatus = "paid";
      if (paymentStatus.status === "cancelled") newStatus = "canceled";
      if (paymentStatus.status === "refunded") newStatus = "refunded";

      if (newStatus) {
        await order.updatePaymentInfo(orderId, {
          gatewayId: String(paymentStatus.id),
          gatewayData: paymentStatus, // Salva o objeto atualizado
          gatewayStatus: newStatus,
        });
      }
    }

    // 4. Retorna 200 OK para o Mercado Pago saber que recebemos
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error);
    // Mesmo com erro interno, as vezes é melhor retornar 200 ou 500 dependendo da estratégia de retry
    // Aqui retornamos 500 para o MP tentar de novo mais tarde
    res.status(500).send("Error processing webhook");
  }
}
