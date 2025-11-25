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

/**
 * Envia e-mail com as credenciais de acesso
 */
async function sendAccountCreatedEmail({ to, username, password, loginLink }) {
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY não configurada.");
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Welcome Email para ${to} | Senha: ${password}`);
      return { success: true, mock: true };
    }
    return { success: false, error: "Service unavailable" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Rakusai Taiko <${EMAIL_FROM}>`,
      to: [to],
      subject: "Bem-vindo ao Site do Rakusai Taiko",
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
          <h2 style="color: #E91E63;">Bem-vindo(a), ${username}!</h2>
          <p>Sua conta foi criada com sucesso.</p>
          <p>Abaixo estão suas credenciais provisórias:</p>
          
          <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Login:</strong> ${to}</p>
            <p style="margin: 5px 0;"><strong>Senha Provisória:</strong> ${password}</p>
          </div>

          <p><strong>Importante:</strong> Por segurança, esta senha está expirada. Ao fazer login, você será solicitado a criar uma nova senha imediatamente.</p>

          <a href="${loginLink}" style="display: inline-block; background-color: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Acessar Site</a>
        </div>
      `,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Erro ao enviar email de boas-vindas:", error);
    // Não lançamos erro aqui para não falhar a criação do usuário no banco
    // Apenas logamos o erro
    return { success: false, error };
  }
}

/**
 * Envia notificação de novo pagamento gerado (Fatura)
 */
async function sendPaymentGeneratedEmail({
  to,
  username,
  planName,
  totalValue,
  discount,
  finalValue,
  dueDate,
  paymentLink,
}) {
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY não configurada.");
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV] Email Pagamento para ${to} | Valor: ${finalValue}`);
      return { success: true, mock: true };
    }
    return { success: false, error: "Service unavailable" };
  }

  // Formatação de Moeda (BRL)
  const formatMoney = (val) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  try {
    const { data, error } = await resend.emails.send({
      from: `Rakusai Financeiro <${EMAIL_FROM}>`,
      to: [to],
      subject: `Fatura Disponível - ${planName}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="color: #E91E63; margin-top: 0;">Olá, ${username}!</h2>
          <p>Uma nova fatura referente ao seu plano <strong>${planName}</strong> foi gerada e já está disponível.</p>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Valor Bruto:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatMoney(totalValue)}</td>
              </tr>
              ${
                discount > 0
                  ? `
              <tr>
                <td style="padding: 8px 0; color: #22c55e;">Desconto:</td>
                <td style="padding: 8px 0; text-align: right; color: #22c55e;">- ${formatMoney(discount)}</td>
              </tr>
              `
                  : ""
              }
              <tr style="border-top: 1px solid #ddd;">
                <td style="padding: 12px 0; font-size: 1.1em; font-weight: bold;">Valor Final:</td>
                <td style="padding: 12px 0; text-align: right; font-size: 1.1em; font-weight: bold; color: #E91E63;">
                  ${formatMoney(finalValue)}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Vencimento:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${dueDate}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${paymentLink}" style="background-color: #E91E63; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Ver Fatura
            </a>
          </div>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
            Se você já realizou o pagamento e indicou no site do Rakusai, por favor desconsidere este e-mail.
          </p>
        </div>
      `,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Erro ao enviar email de pagamento:", error);
    return { success: false, error };
  }
}

export const emailService = {
  sendPasswordResetEmail,
  sendAccountCreatedEmail,
  sendPaymentGeneratedEmail,
};
