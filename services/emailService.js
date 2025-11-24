import { Resend } from "resend";
import { ServiceError } from "errors";

// Inicializa o cliente Resend apenas se a chave existir
// Isso evita erros no build se a chave não estiver configurada
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Envia um e-mail transacional
 * @param {Object} params
 * @param {string} params.to - E-mail do destinatário
 * @param {string} params.subject - Assunto do e-mail
 * @param {string} params.html - Corpo do e-mail em HTML
 * @param {string} [params.text] - Versão texto puro (opcional, mas recomendada para acessibilidade)
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!resend) {
    console.warn(
      "⚠️ RESEND_API_KEY não configurada. O e-mail não será enviado.",
    );
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV EMAIL MOCK] Para: ${to} | Assunto: ${subject}`);
    }
    return { success: false, error: "Service not configured" };
  }

  try {
    const fromEmail = process.env.EMAIL_FROM_DEFAULT || "onboarding@resend.dev"; // Fallback para testes

    const data = await resend.emails.send({
      from: `Rakusai Taiko <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ""), // Remove tags HTML simples para gerar texto
    });

    if (data.error) {
      console.error("Erro no envio do Resend:", data.error);
      throw new ServiceError({
        message: data.error.message,
        cause: data.error,
      });
    }

    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error("Falha ao enviar e-mail:", error);
    return { success: false, error: error.message };
  }
}
