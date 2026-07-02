/**
 * Este model gerencia a configuração global do PDV (tabela singleton):
 * desconto padrão do carrinho, piso e teto de desconto.
 */

import database from "infra/database.js";
import validator from "models/validator.js";
import { ServiceError, ValidationError } from "errors/index.js";

/**
 * Retorna a configuração atual do PDV.
 */
async function get() {
  const result = await database.query({
    text: "SELECT * FROM pdv_settings WHERE singleton = true;",
  });

  if (result.rowCount === 0) {
    throw new ServiceError({
      message: "Configuração do PDV não inicializada.",
      action: "Verifique se as migrations foram executadas corretamente.",
    });
  }

  return result.rows[0];
}

/**
 * Atualiza parcialmente a configuração do PDV.
 */
async function update(settingsData) {
  const validationKeys = {};
  Object.keys(settingsData).forEach((key) => {
    validationKeys[key] = "optional";
  });

  const cleanValues = validator(settingsData, validationKeys);

  if (Object.keys(cleanValues).length === 0) {
    throw new ValidationError({
      message: "Nenhum dado válido para atualização.",
    });
  }

  const sets = [];
  const values = [];
  let paramIndex = 1;

  Object.entries(cleanValues).forEach(([key, value]) => {
    sets.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  const result = await database.query({
    text: `
      UPDATE pdv_settings
      SET ${sets.join(", ")}, updated_at = (now() at time zone 'utc')
      WHERE singleton = true
      RETURNING *;
    `,
    values,
  });

  return result.rows[0];
}

export default {
  get,
  update,
};
