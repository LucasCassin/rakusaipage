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
      message: "Este cupom foi desativado.",
    });
  }

  // 2. Verifica Data de Validade
  if (coupon.expiration_date) {
    const now = new Date();
    const expiration = new Date(coupon.expiration_date);
    if (now > expiration) {
      throw new ValidationError({
        message: "Este cupom expirou.",
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
      message: `Este cupom requer um valor mínimo de compra de R$ ${minReais}.`,
    });
  }

  // 4. Verifica Limites de Uso (Requer consulta na tabela de pedidos)
  if (coupon.usage_limit_global || coupon.usage_limit_per_user) {
    const usageQuery = {
      text: `
        SELECT 
          count(*) as total_usage,
          count(*) filter (where user_id = $2) as user_usage
        FROM orders 
        WHERE applied_coupon_id = $1 
        AND status <> 'canceled'
        AND status <> 'refunded';
      `,
      values: [coupon.id, cleanValues.user_id],
    };

    const usageResult = await database.query(usageQuery);
    const totalUsage = parseInt(usageResult.rows[0].total_usage);
    const userUsage = parseInt(usageResult.rows[0].user_usage);

    if (coupon.usage_limit_global && totalUsage >= coupon.usage_limit_global) {
      throw new ValidationError({
        message: "Este cupom atingiu o limite máximo de utilizações.",
      });
    }

    if (
      coupon.usage_limit_per_user &&
      userUsage >= coupon.usage_limit_per_user
    ) {
      throw new ValidationError({
        message: "Você já atingiu o limite de uso para este cupom.",
      });
    }
  }

  return coupon;
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
      // NOVOS CAMPOS
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
        type, max_discount_in_cents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      // Default: 'subtotal'
      cleanValues.coupon_type || "subtotal",
      // Default: null (sem teto)
      cleanValues.max_discount_in_cents || null,
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
};
