/**
 * Este model gerencia o catálogo de produtos do PDV (Ponto de Venda),
 * incluindo o mecanismo seguro de ajuste de estoque sob concorrência.
 */

import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ValidationError, ServiceError } from "errors/index.js";

/**
 * Helper para decidir qual cliente usar (conexão avulsa ou transação em andamento).
 */
function getQueryRunner(transactionClient) {
  return transactionClient || database;
}

/**
 * Cria um novo produto do PDV.
 */
async function create(productData) {
  const cleanValues = validator(productData, {
    name: "required",
    price_in_cents: "required",
    stock_quantity: "optional",
    min_unit_price_in_cents: "optional",
    default_discount_type: "optional",
    default_discount_value: "optional",
    allow_negative_stock: "optional",
    max_negative_stock: "optional",
    is_active: "optional",
  });

  const query = {
    text: `
      INSERT INTO pdv_products (
        name, price_in_cents, stock_quantity, min_unit_price_in_cents,
        default_discount_type, default_discount_value,
        allow_negative_stock, max_negative_stock, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `,
    values: [
      cleanValues.name,
      cleanValues.price_in_cents,
      cleanValues.stock_quantity ?? 0,
      cleanValues.min_unit_price_in_cents ?? 0,
      cleanValues.default_discount_type || null,
      cleanValues.default_discount_value ?? null,
      cleanValues.allow_negative_stock ?? false,
      cleanValues.max_negative_stock ?? null,
      cleanValues.is_active ?? true,
    ],
  };

  try {
    const result = await database.query(query);
    return result.rows[0];
  } catch (error) {
    if (!error.code) {
      throw error;
    }
    throw database.handleDatabaseError(error);
  }
}

/**
 * Busca um produto do PDV pelo ID.
 */
async function findById(id, transactionClient) {
  const cleanId = validator({ id }, { id: "required" }).id;
  const client = getQueryRunner(transactionClient);

  const result = await client.query({
    text: "SELECT * FROM pdv_products WHERE id = $1;",
    values: [cleanId],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Produto do PDV não encontrado.",
      action: "Verifique o ID informado.",
    });
  }

  return result.rows[0];
}

/**
 * Busca vários produtos do PDV pelos IDs, travando as linhas (`FOR UPDATE`).
 * Uso exclusivo dentro de uma transação (ex: criação de uma venda).
 */
async function findManyByIdsForUpdate(ids, transactionClient) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const client = getQueryRunner(transactionClient);
  const result = await client.query({
    text: "SELECT * FROM pdv_products WHERE id = ANY($1::uuid[]) FOR UPDATE;",
    values: [ids],
  });

  return result.rows;
}

/**
 * Lista produtos do PDV com paginação e filtros básicos.
 */
async function findAll({ limit = 20, offset = 0, search, isActive } = {}) {
  const validated = validator(
    { limit, offset, search_term: search, is_active: isActive },
    {
      limit: "required",
      offset: "required",
      search_term: "optional",
      is_active: "optional",
    },
  );

  const values = [validated.limit, validated.offset];
  let whereClause = "WHERE 1=1";
  let paramIndex = 3;

  if (validated.search_term) {
    whereClause += ` AND name ILIKE $${paramIndex}`;
    values.push(`%${validated.search_term}%`);
    paramIndex++;
  }

  if (validated.is_active !== undefined) {
    whereClause += ` AND is_active = $${paramIndex}`;
    values.push(validated.is_active);
    paramIndex++;
  }

  const query = {
    text: `
      SELECT *, count(*) OVER() as total_count
      FROM pdv_products
      ${whereClause}
      ORDER BY name ASC
      LIMIT $1 OFFSET $2;
    `,
    values,
  };

  const result = await database.query(query);
  return {
    products: result.rows,
    count: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
  };
}

/**
 * Atualiza dados cadastrais de um produto do PDV.
 * `stock_quantity` não pode ser alterado por aqui — use `adjustStock`.
 */
async function update(id, productData) {
  const cleanId = validator({ id }, { id: "required" }).id;

  if (Object.prototype.hasOwnProperty.call(productData, "stock_quantity")) {
    throw new ValidationError({
      message: "O campo stock_quantity não pode ser alterado por esta rota.",
      action:
        "Utilize o endpoint de ajuste de estoque para alterar a quantidade.",
    });
  }

  const validationKeys = {};
  Object.keys(productData).forEach((key) => {
    validationKeys[key] = "optional";
  });

  const cleanValues = validator(productData, validationKeys);

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

  const query = {
    text: `
      UPDATE pdv_products
      SET ${sets.join(", ")}, updated_at = (now() at time zone 'utc')
      WHERE id = $1
      RETURNING *;
    `,
    values,
  };

  const result = await database.query(query);

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Produto do PDV não encontrado para atualização.",
    });
  }

  return result.rows[0];
}

/**
 * Remove (soft-delete) um produto do PDV, preservando o histórico de vendas.
 */
async function remove(id) {
  return update(id, { is_active: false });
}

/**
 * Verifica se o produto já foi vendido (referenciado por `pdv_sale_items`),
 * usado pela tela de exclusão para avisar se o `hardDelete` vai falhar.
 */
async function isInUse(id) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const result = await database.query({
    text: "SELECT EXISTS (SELECT 1 FROM pdv_sale_items WHERE product_id = $1) AS in_use;",
    values: [cleanId],
  });

  return result.rows[0].in_use;
}

/**
 * Exclui definitivamente um produto do PDV. Se o produto já foi vendido
 * (referenciado por `pdv_sale_items`), o banco bloqueia via FK e o erro é
 * convertido em um `ServiceError` 409 — nesse caso, use `remove` (inativar).
 */
async function hardDelete(id) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const result = await database.query({
    text: "DELETE FROM pdv_products WHERE id = $1 RETURNING *;",
    values: [cleanId],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Produto do PDV não encontrado para exclusão.",
    });
  }

  return result.rows[0];
}

/**
 * Ajusta o estoque de forma atômica e segura sob concorrência.
 * `deltaQuantity` já deve vir com sinal (negativo para baixa, positivo para reposição).
 * O próprio UPDATE, ao travar a linha, reavalia o WHERE contra o valor committed,
 * então múltiplas chamadas concorrentes nunca deixam o estoque num estado inválido.
 */
async function adjustStock(id, deltaQuantity, transactionClient) {
  const cleanValues = validator(
    { id, stock_delta_quantity: deltaQuantity },
    { id: "required", stock_delta_quantity: "required" },
  );
  const client = getQueryRunner(transactionClient);

  const result = await client.query({
    text: `
      UPDATE pdv_products
      SET stock_quantity = stock_quantity + $1, updated_at = (now() at time zone 'utc')
      WHERE id = $2
        AND (allow_negative_stock = true OR stock_quantity + $1 >= 0)
        AND (
          allow_negative_stock = false
          OR max_negative_stock IS NULL
          OR stock_quantity + $1 >= -max_negative_stock
        )
      RETURNING *;
    `,
    values: [cleanValues.stock_delta_quantity, cleanValues.id],
  });

  if (result.rowCount === 0) {
    const productCheck = await client.query({
      text: "SELECT id FROM pdv_products WHERE id = $1;",
      values: [cleanValues.id],
    });

    if (productCheck.rowCount === 0) {
      throw new NotFoundError({
        message: "Produto do PDV não encontrado.",
      });
    }

    throw new ServiceError({
      message: "Estoque insuficiente para o produto solicitado.",
      action:
        "Reduza a quantidade ou ajuste as regras de estoque negativo do produto.",
      statusCode: 409,
    });
  }

  return result.rows[0];
}

/**
 * Dá baixa no estoque de todos os itens de uma venda, dentro da mesma transação.
 */
async function decrementForSale(items, transactionClient) {
  for (const item of items) {
    await adjustStock(item.product_id, -item.quantity, transactionClient);
  }
}

/**
 * Devolve ao estoque os itens de uma venda cancelada, dentro da mesma transação.
 */
async function restockForCancel(items, transactionClient) {
  for (const item of items) {
    await adjustStock(item.product_id, item.quantity, transactionClient);
  }
}

export default {
  create,
  findById,
  findManyByIdsForUpdate,
  findAll,
  update,
  remove,
  hardDelete,
  isInUse,
  adjustStock,
  decrementForSale,
  restockForCancel,
};
