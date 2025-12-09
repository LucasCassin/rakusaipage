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
        notification_url: `${process.env.NEXT_PUBLIC_Web_URL}/api/v1/webhooks/mercadopago`,
      },
    };

    const result = await payment.create(paymentData);

    // Retorna apenas o que interessa para o nosso sistema
    return {
      gateway_id: result.id.toString(),
      status: result.status,
      qr_code: result.point_of_interaction.transaction_data.qr_code,
      qr_code_base64:
        result.point_of_interaction.transaction_data.qr_code_base64,
      ticket_url: result.point_of_interaction.transaction_data.ticket_url,
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
