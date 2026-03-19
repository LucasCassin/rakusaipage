import { createRouter } from "next-connect";
import controller from "models/controller.js";
import order from "models/order.js";
import payment from "models/payment.js";
import paymentGateway from "services/payment-gateway.js";
import { NotFoundError } from "errors/index.js";

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
    // 1. SEGURANÇA: MP é fonte da verdade em produção.
    // Em dev/test, fallback para payload quando getPaymentStatus falhar.
    let paymentStatus = null;
    const isProd = process.env.NODE_ENV === "production";

    try {
      paymentStatus = await paymentGateway.getPaymentStatus(paymentId);
    } catch (err) {
      console.warn("MercadoPago fetch failed:", err?.message);
      if (isProd) {
        throw err; // em produção não aceitamos fallback
      }
    }

    const payloadStatus = req.body?.data?.status || req.body?.status || null;
    const payloadExternalReference =
      req.body?.data?.external_reference ||
      req.body?.external_reference ||
      null;

    if (!paymentStatus && !isProd && payloadStatus) {
      paymentStatus = {
        id: paymentId,
        status: payloadStatus,
        external_reference: payloadExternalReference,
        raw_payload: req.body,
      };
    }

    if (paymentStatus) {
      if (payloadStatus && payloadStatus !== paymentStatus.status) {
        paymentStatus.status = payloadStatus;
      }
      if (!paymentStatus.external_reference && payloadExternalReference) {
        paymentStatus.external_reference = payloadExternalReference;
      }

      const externalReference = paymentStatus.external_reference;

      // 3. Mapeia status do MP para nosso sistema
      let orderStatus = null;
      if (paymentStatus.status === "approved") orderStatus = "paid";
      if (paymentStatus.status === "cancelled") orderStatus = "canceled";
      if (paymentStatus.status === "refunded") orderStatus = "refunded";

      // 4. Tenta aplicar ao pedido (e-commerce antigo)
      if (externalReference) {
        try {
          await order.updatePaymentInfo(externalReference, {
            gatewayId: String(paymentStatus.id),
            gatewayData: paymentStatus,
            gatewayStatus: orderStatus,
          });
        } catch (error) {
          if (!(error instanceof NotFoundError)) {
            throw error;
          }

          // Se o pedido não for encontrado, tenta o fluxo de pagamento de mensalidade.
          const targetPayment = await payment
            .findById(externalReference)
            .catch((err) => {
              if (err instanceof NotFoundError) return null;
              throw err;
            });

          if (targetPayment) {
            await payment.updateGatewayInfo(targetPayment.id, {
              gatewayId: String(paymentStatus.id),
              gatewayStatus: paymentStatus.status,
              gatewayData: paymentStatus,
            });

            if (paymentStatus.status === "approved") {
              try {
                await payment.adminConfirmPaid(targetPayment.id);
              } catch (err) {
                if (!(err instanceof NotFoundError)) {
                  throw err;
                }
              }
            }
          }
        }
      }

      // 5. Caso external_reference não exista ou não seja encontrado, tenta achar via gateway_id direto.
      if (!externalReference) {
        const targetPaymentByGateway = await payment
          .findByGatewayId(String(paymentStatus.id))
          .catch((err) => {
            if (err instanceof NotFoundError) return null;
            throw err;
          });

        if (targetPaymentByGateway) {
          await payment.updateGatewayInfo(targetPaymentByGateway.id, {
            gatewayId: String(paymentStatus.id),
            gatewayStatus: paymentStatus.status,
            gatewayData: paymentStatus,
          });

          if (paymentStatus.status === "approved") {
            try {
              await payment.adminConfirmPaid(targetPaymentByGateway.id);
            } catch (err) {
              if (!(err instanceof NotFoundError)) {
                throw err;
              }
            }
          }
        }
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
