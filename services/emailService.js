import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM =
  process.env.EMAIL_FROM_DEFAULT || "sistema@rakusaitaiko.com.br";

/**
 * Envia e-mail de recuperação de senha
 * @param {string} to - Email do destinatário
 * @param {string} resetLink - Link completo para reset
 */
async function sendPasswordResetEmail(to, resetLink) {
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY não configurada.");
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[DEV - EMAIL MOCK] Recuperação para ${to}. Link: ${resetLink}`,
      );
      return { success: true, mock: true };
    }
    return { success: false, error: "Service unavailable" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Rakusai Taiko <${EMAIL_FROM}>`,
      to: [to],
      subject: "Recuperação de Senha - Rakusai",
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h1>Recuperação de Senha</h1>
          <p>Você solicitou a redefinição de sua senha. Clique no botão abaixo para criar uma nova:</p>
          <a href="${resetLink}" style="background-color: #E91E63; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Redefinir Senha</a>
          <p>Este link é válido por 30 minutos.</p>
          <p style="font-size: 12px; color: #666;">Se você não solicitou isso, ignore este e-mail.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Erro Resend:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Erro ao enviar email:", err);
    return { success: false, error: err.message };
  }
}

export const emailService = {
  sendPasswordResetEmail,
};
