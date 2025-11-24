import database from "infra/database";
import crypto from "node:crypto";
import validator from "models/validator";

// Tipos de token suportados
const TYPES = {
  PASSWORD_RESET: "password_reset",
};

/**
 * Cria um novo token para um usuário
 * @param {Object} params
 * @param {string} params.userId - ID do usuário
 * @param {string} params.type - Tipo do token (use token.TYPES)
 * @param {number} [params.expiresInMinutes=30] - Validade em minutos
 */
async function create({ userId, type, expiresInMinutes = 30 }) {
  const validaeUserId = validator({ id: userId }, { id: "required" });
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

  const query = {
    text: `
      INSERT INTO tokens (user_id, token, type, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `,
    values: [validaeUserId.id, token, type, expiresAt],
  };

  const result = await database.query(query);
  return result.rows[0];
}

/**
 * Busca um token válido (não usado e não expirado)
 * @param {string} tokenString - O token recebido
 * @param {string} type - O tipo esperado
 */
async function findValidToken(tokenString, type) {
  const token = validator(
    { token_model: tokenString },
    { token_model: "required" },
  );
  const query = {
    text: `
      SELECT * FROM tokens
      WHERE token = $1
      AND type = $2
      AND used = false
      AND expires_at > NOW();
    `,
    values: [token.token_model, type],
  };

  const result = await database.query(query);
  return result.rows[0] || null;
}

/**
 * Marca um token como usado
 * @param {string} tokenId
 */
async function markAsUsed(tokenId) {
  const token = validator({ id: tokenId }, { id: "required" });
  const query = {
    text: `
      UPDATE tokens
      SET used = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `,
    values: [token.id],
  };

  const result = await database.query(query);
  return result.rows[0];
}

/**
 * Verifica se o usuário solicitou um token recentemente (Rate Limit)
 * @param {string} userId
 * @param {string} type
 * @param {number} windowMinutes - Janela de tempo para verificação (ex: 5 min)
 */
async function hasRecentRequest(userId, type, windowMinutes = 5) {
  const validaeUserId = validator({ id: userId }, { id: "required" });
  const query = {
    text: `
      SELECT COUNT(*) as count FROM tokens
      WHERE user_id = $1
      AND type = $2
      AND created_at > NOW() - INTERVAL '${windowMinutes} minutes';
    `,
    values: [validaeUserId.id, type],
  };

  const result = await database.query(query);
  const count = parseInt(result.rows[0].count, 10);
  return count > 0;
}

export default {
  create,
  findValidToken,
  markAsUsed,
  hasRecentRequest,
  TYPES,
};
