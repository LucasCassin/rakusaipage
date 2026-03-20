import { MercadoPagoConfig, Payment } from "mercadopago";
import { ServiceError } from "errors/index.js"; // Supondo que você tenha ou crie um erro genérico

// Inicializa o cliente com o Access Token de Produção ou Teste
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  options: { timeout: 5000 },
});

const payment = new Payment(client);

/**
 * Cria uma cobrança PIX no Mercado Pago.
 * @param {Object} order - O objeto Order criado no nosso banco.
 * @param {Object} user - Dados do usuário (email, nome).
 * @returns {Object} - Dados para o Frontend (QR Code, Copy&Paste, Payment ID).
 */
async function createPixPayment(order, user) {
  try {
    const paymentData = {
      body: {
        transaction_amount: order.total_in_cents / 100, // MP espera em Reais (float)
        description: `Pedido #${order.id.slice(0, 8)} - Rakusai`,
        payment_method_id: "pix",
        payer: {
          email: user.email,
          first_name: user.username, // Ou nome real se tiver no cadastro
        },
        external_reference: order.id, // VITAL: Linka o ID do nosso banco com o MP
        notification_url: `${process.env.NEXT_PUBLIC_WEB_URL}/api/v1/webhooks/mercadopago`,
      },
    };

    const result = await payment.create(paymentData);

    const pixData = result.point_of_interaction?.transaction_data || {};
    // Se não veio qr no sandbox/prod, registra warn para análise
    if (!pixData.qr_code_base64 && !pixData.qr_code && !pixData.ticket_url) {
      console.warn("[payment-gateway] MP PIX não retornou QR data", pixData);
    }

    // Retorna apenas o que interessa para o nosso sistema
    return {
      gateway_id: result.id.toString(),
      status: result.status,
      qr_code: pixData.qr_code,
      qr_code_base64: pixData.qr_code_base64,
      ticket_url: pixData.ticket_url,
      point_of_interaction: result.point_of_interaction,
    };
  } catch (error) {
    console.error("Erro ao criar pagamento no Mercado Pago:", error);
    throw new ServiceError({
      message: "Erro ao comunicar com o gateway de pagamento.",
      action: "Tente novamente mais tarde.",
    });
  }
}

/**
 * Busca o status atual de um pagamento (útil para polling ou verificar webhook).
 */
async function getPaymentStatus(paymentId) {
  try {
    const result = await payment.get({ id: paymentId });
    return {
      id: result.id,
      status: result.status, // approved, pending, rejected
      external_reference: result.external_reference,
      point_of_interaction: result.point_of_interaction,
    };
  } catch (error) {
    console.error("Erro ao buscar pagamento:", error);
    return null;
  }
}

export default {
  createPixPayment,
  getPaymentStatus,
};
