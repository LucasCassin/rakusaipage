import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ValidationError } from "errors/index.js";

/**
 * Busca um cupom pelo código (Case Insensitive).
 */
async function findByCode(code) {
  const cleanCode = validator({ code }, { code: "required" }).code;

  const result = await database.query({
    text: "SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) LIMIT 1;",
    values: [cleanCode],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Cupom inválido ou não encontrado.",
    });
  }

  return result.rows[0];
}

/**
 * Valida se um cupom pode ser aplicado a um carrinho/usuário específico.
 * Verifica: Ativo, Data, Valor Mínimo e Limites de Uso (Global e por Usuário).
 *
 * @param {string} code - Código do cupom.
 * @param {string} userId - ID do usuário que está comprando.
 * @param {number} amountInCents - Valor total dos produtos (sem frete) para validar regra de mínimo.
 */
async function validate(code, userId, amountInCents) {
  const cleanValues = validator(
    { code, user_id: userId, price_in_cents: amountInCents },
    {
      code: "required",
      user_id: "required",
      price_in_cents: "required",
    },
  );
  cleanValues.amount = cleanValues.price_in_cents;
  const coupon = await findByCode(cleanValues.code);

  // 1. Verifica se está ativo
  if (!coupon.is_active) {
    throw new ValidationError({
      message: `O cupom ${coupon.code} foi desativado.`,
    });
  }

  // 2. Verifica Data de Validade
  if (coupon.expiration_date) {
    const now = new Date();
    const expiration = new Date(coupon.expiration_date);
    if (now > expiration) {
      throw new ValidationError({
        message: `O cupom ${coupon.code} expirou.`,
      });
    }
  }

  // 3. Verifica Valor Mínimo de Compra
  // Nota: Mesmo para cupons de frete, o gatilho pode ser o valor dos produtos (Ex: Frete grátis em compras acima de X)
  if (
    coupon.min_purchase_value_in_cents &&
    cleanValues.amount < coupon.min_purchase_value_in_cents
  ) {
    const minReais = (coupon.min_purchase_value_in_cents / 100).toFixed(2);
    throw new ValidationError({
      message: `O cupom ${coupon.code} requer um valor mínimo de compra de R$ ${minReais}.`,
    });
  }

  // 4. Verifica Limites de Uso (Requer consulta na tabela de pedidos)
  if (coupon.usage_limit_global || coupon.usage_limit_per_user) {
    // Busca pedidos não cancelados que contenham este cupom no array 'applied_coupons'
    // O operador @> verifica se o JSON do banco contém o objeto passado (pelo ID)
    const usageQuery = {
      text: `
        SELECT 
          count(*) as total_usage,
          count(*) filter (where user_id = $2) as user_usage
        FROM orders 
        WHERE applied_coupons @> $1::jsonb
        AND status <> 'canceled'
        AND status <> 'refunded';
      `,
      // Montamos um JSON parcial `[{ "id": "..." }]` para o Postgres buscar dentro do array
      values: [JSON.stringify([{ id: coupon.id }]), cleanValues.user_id],
    };

    const usageResult = await database.query(usageQuery);
    const totalUsage = parseInt(usageResult.rows[0].total_usage);
    const userUsage = parseInt(usageResult.rows[0].user_usage);

    if (coupon.usage_limit_global && totalUsage >= coupon.usage_limit_global) {
      throw new ValidationError({
        message: `O cupom ${coupon.code} atingiu o limite máximo de utilizações.`,
      });
    }

    if (
      coupon.usage_limit_per_user &&
      userUsage >= coupon.usage_limit_per_user
    ) {
      throw new ValidationError({
        message: `Você já atingiu o limite de uso para este cupom (${coupon.code}).`,
      });
    }
  }

  return coupon;
}

/**
 * Valida múltiplos cupons e remove duplicados.
 */
async function validateMultiple(codes, userId, amountInCents) {
  if (!Array.isArray(codes) || codes.length === 0) return [];

  // Remove duplicados e normaliza
  const uniqueCodes = [...new Set(codes.map((c) => c.toUpperCase()))];
  const validCoupons = [];

  for (const code of uniqueCodes) {
    // Validamos um a um. Se um falhar, lançamos erro ou ignoramos?
    // Regra de negócio: Se o cliente mandou código inválido, avisa erro.
    const coupon = await validate(code, userId, amountInCents);
    validCoupons.push(coupon);
  }

  return validCoupons;
}

/**
 * Cria um novo cupom (Função administrativa).
 */
async function create(couponData) {
  const cleanValues = validator(
    { ...couponData, coupon_type: couponData.type },
    {
      code: "required",
      description: "required",
      discount_percentage: "required",
      min_purchase_value_in_cents: "optional",
      usage_limit_global: "optional",
      usage_limit_per_user: "optional",
      expiration_date: "optional",
      is_active: "optional",
      is_cumulative: "optional",
      coupon_type: "optional", // 'subtotal' ou 'shipping'
      max_discount_in_cents: "optional",
    },
  );

  const query = {
    text: `
      INSERT INTO coupons (
        code, description, discount_percentage, 
        min_purchase_value_in_cents, usage_limit_global, usage_limit_per_user,
        expiration_date, is_active,
        type, max_discount_in_cents, is_cumulative
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `,
    values: [
      cleanValues.code.toUpperCase(),
      cleanValues.description,
      cleanValues.discount_percentage,
      cleanValues.min_purchase_value_in_cents || 0,
      cleanValues.usage_limit_global || null,
      cleanValues.usage_limit_per_user || 1,
      cleanValues.expiration_date || null,
      cleanValues.is_active ?? true,
      cleanValues.coupon_type || "subtotal",
      cleanValues.max_discount_in_cents || null,
      cleanValues.is_cumulative ?? false,
    ],
  };

  try {
    const result = await database.query(query);
    return result.rows[0];
  } catch (error) {
    if (
      (error.cause = `duplicate key value violates unique constraint "coupons_code_key"`)
    ) {
      throw new ValidationError({
        message: "Já existe um cupom com este código.",
      });
    }
    throw error;
  }
}

export default {
  create,
  findByCode,
  validate,
  validateMultiple,
};
