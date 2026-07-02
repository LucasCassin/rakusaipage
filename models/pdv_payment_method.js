/**
 * Este model gerencia as formas de pagamento do PDV e suas variantes
 * (ex: "Pix", "Cartão Débito" com variantes "Máquina Amarela", "Máquina Verde").
 * As formas de pagamento são ilustrativas — o pagamento real ocorre fora do sistema.
 */

import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ValidationError } from "errors/index.js";

const FIND_ALL_WITH_VARIANTS_QUERY = `
  SELECT
    pm.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id', pmv.id,
          'payment_method_id', pmv.payment_method_id,
          'name', pmv.name,
          'is_active', pmv.is_active,
          'created_at', pmv.created_at,
          'updated_at', pmv.updated_at
        ) ORDER BY pmv.name
      ) FILTER (WHERE pmv.id IS NOT NULL),
      '[]'
    ) AS variants
  FROM pdv_payment_methods pm
  LEFT JOIN pdv_payment_method_variants pmv ON pmv.payment_method_id = pm.id
`;

/**
 * Cria uma nova forma de pagamento.
 */
async function create(paymentMethodData) {
  const cleanValues = validator(paymentMethodData, { name: "required" });

  try {
    const result = await database.query({
      text: "INSERT INTO pdv_payment_methods (name) VALUES ($1) RETURNING *;",
      values: [cleanValues.name],
    });
    return result.rows[0];
  } catch (error) {
    if (error.cause?.code === "23505") {
      throw new ValidationError({
        message: "Já existe uma forma de pagamento com este nome.",
      });
    }
    if (!error.code) {
      throw error;
    }
    throw database.handleDatabaseError(error);
  }
}

/**
 * Lista formas de pagamento, cada uma com suas variantes agregadas.
 */
async function findAll({ includeInactive = false } = {}) {
  const whereClause = includeInactive ? "" : "WHERE pm.is_active = true";

  const result = await database.query({
    text: `
      ${FIND_ALL_WITH_VARIANTS_QUERY}
      ${whereClause}
      GROUP BY pm.id
      ORDER BY pm.name ASC;
    `,
  });

  if (includeInactive) {
    return result.rows;
  }

  return result.rows.map((paymentMethod) => ({
    ...paymentMethod,
    variants: paymentMethod.variants.filter((variant) => variant.is_active),
  }));
}

/**
 * Busca uma forma de pagamento pelo ID, com variantes agregadas.
 */
async function findById(id) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const result = await database.query({
    text: `
      ${FIND_ALL_WITH_VARIANTS_QUERY}
      WHERE pm.id = $1
      GROUP BY pm.id;
    `,
    values: [cleanId],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Forma de pagamento não encontrada.",
    });
  }

  return result.rows[0];
}

/**
 * Atualiza uma forma de pagamento.
 */
async function update(id, paymentMethodData) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const validationKeys = {};
  Object.keys(paymentMethodData).forEach((key) => {
    validationKeys[key] = "optional";
  });

  const cleanValues = validator(paymentMethodData, validationKeys);

  if (Object.keys(cleanValues).length === 0) {
    throw new ValidationError({
      message: "Nenhum dado válido para atualização.",
    });
  }

  const sets = [];
  const values = [cleanId];
  let paramIndex = 2;

  Object.entries(cleanValues).forEach(([key, value]) => {
    sets.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  try {
    const result = await database.query({
      text: `
        UPDATE pdv_payment_methods
        SET ${sets.join(", ")}, updated_at = (now() at time zone 'utc')
        WHERE id = $1
        RETURNING *;
      `,
      values,
    });

    if (result.rowCount === 0) {
      throw new NotFoundError({
        message: "Forma de pagamento não encontrada para atualização.",
      });
    }

    return result.rows[0];
  } catch (error) {
    if (error.cause?.code === "23505") {
      throw new ValidationError({
        message: "Já existe uma forma de pagamento com este nome.",
      });
    }
    throw error;
  }
}

/**
 * Verifica se a forma de pagamento já foi usada em alguma venda (referenciada
 * por `pdv_sale_payments`), usado pela tela de exclusão para avisar se o
 * `hardDelete` vai falhar.
 */
async function isMethodInUse(id) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const result = await database.query({
    text: "SELECT EXISTS (SELECT 1 FROM pdv_sale_payments WHERE payment_method_id = $1) AS in_use;",
    values: [cleanId],
  });

  return result.rows[0].in_use;
}

/**
 * Remove (soft-delete) uma forma de pagamento, desativando também suas
 * variantes ativas em cascata lógica — evita variantes "órfãs" ativas de
 * uma forma de pagamento inativa.
 */
async function remove(id) {
  const cleanId = validator({ id }, { id: "required" }).id;
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    const result = await client.query({
      text: `
        UPDATE pdv_payment_methods
        SET is_active = false, updated_at = (now() at time zone 'utc')
        WHERE id = $1
        RETURNING *;
      `,
      values: [cleanId],
    });

    if (result.rowCount === 0) {
      throw new NotFoundError({
        message: "Forma de pagamento não encontrada para remoção.",
      });
    }

    await client.query({
      text: `
        UPDATE pdv_payment_method_variants
        SET is_active = false, updated_at = (now() at time zone 'utc')
        WHERE payment_method_id = $1 AND is_active = true;
      `,
      values: [cleanId],
    });

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    }
    throw database.handleDatabaseError(error);
  } finally {
    await client.end();
  }
}

/**
 * Exclui definitivamente uma forma de pagamento e suas variantes, numa
 * transação. Se a forma (ou qualquer uma de suas variantes) já foi usada em
 * alguma venda, o banco bloqueia via FK e a transação inteira é desfeita —
 * nesse caso, use `remove` (inativar) em vez de excluir.
 */
async function hardDelete(id) {
  const cleanId = validator({ id }, { id: "required" }).id;
  const client = await database.getNewClient();

  try {
    await client.query("BEGIN");

    await client.query({
      text: "DELETE FROM pdv_payment_method_variants WHERE payment_method_id = $1;",
      values: [cleanId],
    });

    const result = await client.query({
      text: "DELETE FROM pdv_payment_methods WHERE id = $1 RETURNING *;",
      values: [cleanId],
    });

    if (result.rowCount === 0) {
      throw new NotFoundError({
        message: "Forma de pagamento não encontrada para exclusão.",
      });
    }

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error;
    }
    throw database.handleDatabaseError(error);
  } finally {
    await client.end();
  }
}

/**
 * Cria uma nova variante para uma forma de pagamento existente e ativa.
 */
async function createVariant(paymentMethodId, variantData) {
  const cleanIds = validator({ id: paymentMethodId }, { id: "required" });
  const cleanValues = validator(variantData, { name: "required" });

  const paymentMethod = await findById(cleanIds.id);
  if (!paymentMethod.is_active) {
    throw new ValidationError({
      message:
        "Não é possível adicionar variantes a uma forma de pagamento inativa.",
    });
  }

  try {
    const result = await database.query({
      text: `
        INSERT INTO pdv_payment_method_variants (payment_method_id, name)
        VALUES ($1, $2)
        RETURNING *;
      `,
      values: [cleanIds.id, cleanValues.name],
    });
    return result.rows[0];
  } catch (error) {
    if (error.cause?.code === "23505") {
      throw new ValidationError({
        message:
          "Já existe uma variante com este nome para esta forma de pagamento.",
      });
    }
    if (!error.code) {
      throw error;
    }
    throw database.handleDatabaseError(error);
  }
}

/**
 * Busca uma variante pelo ID.
 */
async function findVariantById(variantId) {
  const cleanId = validator({ id: variantId }, { id: "required" }).id;

  const result = await database.query({
    text: "SELECT * FROM pdv_payment_method_variants WHERE id = $1;",
    values: [cleanId],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Variante de forma de pagamento não encontrada.",
    });
  }

  return result.rows[0];
}

/**
 * Atualiza uma variante.
 */
async function updateVariant(variantId, variantData) {
  const cleanId = validator({ id: variantId }, { id: "required" }).id;

  const validationKeys = {};
  Object.keys(variantData).forEach((key) => {
    validationKeys[key] = "optional";
  });

  const cleanValues = validator(variantData, validationKeys);

  if (Object.keys(cleanValues).length === 0) {
    throw new ValidationError({
      message: "Nenhum dado válido para atualização.",
    });
  }

  const sets = [];
  const values = [cleanId];
  let paramIndex = 2;

  Object.entries(cleanValues).forEach(([key, value]) => {
    sets.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  try {
    const result = await database.query({
      text: `
        UPDATE pdv_payment_method_variants
        SET ${sets.join(", ")}, updated_at = (now() at time zone 'utc')
        WHERE id = $1
        RETURNING *;
      `,
      values,
    });

    if (result.rowCount === 0) {
      throw new NotFoundError({
        message: "Variante não encontrada para atualização.",
      });
    }

    return result.rows[0];
  } catch (error) {
    if (error.cause?.code === "23505") {
      throw new ValidationError({
        message:
          "Já existe uma variante com este nome para esta forma de pagamento.",
      });
    }
    throw error;
  }
}

/**
 * Verifica se a variante já foi usada em alguma venda (referenciada por
 * `pdv_sale_payments`), usado pela tela de exclusão para avisar se o
 * `removeVariant` vai falhar.
 */
async function isVariantInUse(variantId) {
  const cleanId = validator({ id: variantId }, { id: "required" }).id;

  const result = await database.query({
    text: "SELECT EXISTS (SELECT 1 FROM pdv_sale_payments WHERE payment_method_variant_id = $1) AS in_use;",
    values: [cleanId],
  });

  return result.rows[0].in_use;
}

/**
 * Exclui definitivamente uma variante. Se já foi usada em alguma venda, o
 * banco bloqueia via FK e o erro é convertido em um `ServiceError` 409.
 */
async function removeVariant(variantId) {
  const cleanId = validator({ id: variantId }, { id: "required" }).id;

  const result = await database.query({
    text: "DELETE FROM pdv_payment_method_variants WHERE id = $1 RETURNING *;",
    values: [cleanId],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Variante não encontrada para exclusão.",
    });
  }

  return result.rows[0];
}

export default {
  create,
  findAll,
  findById,
  update,
  remove,
  hardDelete,
  isMethodInUse,
  createVariant,
  findVariantById,
  updateVariant,
  removeVariant,
  isVariantInUse,
};
