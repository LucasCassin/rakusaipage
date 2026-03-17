import database from "infra/database.js";
import validator from "models/validator.js";
import { ValidationError, NotFoundError, ServiceError } from "errors/index.js";

/**
 * Cria um novo Grupo de Produtos (Vitrine/Coleção).
 */
async function create(groupData) {
  const cleanValues = validator(
    { product_group: groupData },
    {
      product_group: "required",
    },
  ).product_group;

  const query = {
    text: `
      INSERT INTO product_groups (
        name, slug, description, images, is_active
      ) VALUES ($1, $2, $3, $4, $5) 
      RETURNING *;
    `,
    values: [
      cleanValues.name,
      cleanValues.slug,
      cleanValues.description || null,
      JSON.stringify(cleanValues.images || []),
      cleanValues.is_active ?? true,
    ],
  };

  try {
    const result = await database.query(query);
    return result.rows[0];
  } catch (error) {
    if (error.message && error.message.includes("product_groups_slug_key")) {
      throw new ValidationError({
        message: "Já existe um grupo com este slug (URL).",
        action: "Escolha um nome diferente ou altere o slug manualmente.",
      });
    }
    throw error;
  }
}

/**
 * Busca um grupo pelo ID, retornando também os produtos vinculados a ele (SKUs).
 * Ideal para uso no Admin.
 */
async function findById(id) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const groupResult = await database.query({
    text: "SELECT * FROM product_groups WHERE id = $1;",
    values: [cleanId],
  });

  if (groupResult.rowCount === 0) {
    throw new NotFoundError({ message: "Grupo de produtos não encontrado." });
  }

  // Busca os produtos atrelados fazendo um JOIN com a tabela pivô
  const itemsResult = await database.query({
    text: `
      SELECT p.*, pgi.variations as group_variations 
      FROM products p
      JOIN product_group_items pgi ON p.id = pgi.product_id
      WHERE pgi.product_group_id = $1
      ORDER BY p.created_at DESC;
    `,
    values: [cleanId],
  });

  return {
    ...groupResult.rows[0],
    items: itemsResult.rows, // Array de produtos com a chave 'group_variations' embutida
  };
}

/**
 * Busca um grupo pelo Slug, retornando os produtos ativos vinculados.
 * Ideal para uso na Vitrine (Frontend Público).
 */
async function findBySlug(slug) {
  const cleanSlug = validator({ slug }, { slug: "required" }).slug;

  const groupResult = await database.query({
    text: "SELECT * FROM product_groups WHERE slug = $1 AND is_active = true;",
    values: [cleanSlug],
  });

  if (groupResult.rowCount === 0) {
    throw new NotFoundError({ message: "Coleção ou grupo não encontrado." });
  }

  const groupId = groupResult.rows[0].id;

  // Busca apenas os produtos que também estão ATIVOS
  const itemsResult = await database.query({
    text: `
      SELECT p.*, pgi.variations as group_variations 
      FROM products p
      JOIN product_group_items pgi ON p.id = pgi.product_id
      WHERE pgi.product_group_id = $1 AND p.is_active = true
      ORDER BY p.created_at DESC;
    `,
    values: [groupId],
  });

  return {
    ...groupResult.rows[0],
    items: itemsResult.rows,
  };
}

/**
 * Lista todos os grupos com paginação e busca.
 */
async function findAll({ limit = 20, offset = 0, is_active, search } = {}) {
  const validateData = validator(
    { limit, offset, is_active, search_term: search },
    {
      limit: "optional",
      offset: "optional",
      is_active: "optional",
      search_term: "optional",
    },
  );

  const values = [validateData.limit || 20, validateData.offset || 0];
  let whereClause = "WHERE 1=1";
  let paramIndex = 3;

  if (validateData.is_active !== undefined) {
    whereClause += ` AND is_active = $${paramIndex}`;
    values.push(validateData.is_active);
    paramIndex++;
  }

  if (validateData.search_term) {
    whereClause += ` AND (name ILIKE $${paramIndex} OR slug ILIKE $${paramIndex})`;
    values.push(`%${validateData.search_term}%`);
    paramIndex++;
  }

  const query = {
    text: `
      SELECT *, count(*) OVER() as total_count
      FROM product_groups
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `,
    values,
  };

  const result = await database.query(query);
  return {
    groups: result.rows,
    count: result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0,
  };
}

/**
 * Atualiza os dados principais de um grupo.
 */
async function update(id, groupData) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const allowedKeys = ["name", "slug", "description", "images", "is_active"];
  const validationKeys = {};

  Object.keys(groupData).forEach((key) => {
    if (allowedKeys.includes(key)) {
      validationKeys[key] = "optional";
    }
  });

  const cleanValues = validator(groupData, validationKeys);
  if (Object.keys(cleanValues).length === 0) {
    throw new ValidationError({
      message: "Nenhum dado válido para atualização.",
    });
  }

  const sets = [];
  const values = [cleanId];
  let paramIndex = 2;

  Object.entries(cleanValues).forEach(([key, value]) => {
    if (key === "images") value = JSON.stringify(value);
    sets.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  const query = {
    text: `
      UPDATE product_groups
      SET ${sets.join(", ")}, updated_at = (now() at time zone 'utc')
      WHERE id = $1
      RETURNING *;
    `,
    values,
  };

  const result = await database.query(query);
  if (result.rowCount === 0)
    throw new NotFoundError({ message: "Grupo não encontrado." });

  return result.rows[0];
}

/**
 * Remove um grupo. (Produtos atrelados NÃO são apagados, apenas desvinculados por causa do CASCADE)
 */
async function del(id) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const result = await database.query({
    text: "DELETE FROM product_groups WHERE id = $1 RETURNING *;",
    values: [cleanId],
  });

  if (result.rowCount === 0)
    throw new NotFoundError({ message: "Grupo não encontrado." });
  return result.rows[0];
}

// ==========================================
// FUNÇÕES DE RELACIONAMENTO (TABELA PIVÔ)
// ==========================================

/**
 * Adiciona um produto físico a um grupo informando suas variações visuais.
 */
async function addItem(groupId, productId, variations = {}) {
  const cleanValues = validator(
    {
      group_id: groupId,
      product_group_item: { product_id: productId, variations },
    },
    { group_id: "required", product_group_item: "required" },
  );

  try {
    const query = {
      text: `
        INSERT INTO product_group_items (product_group_id, product_id, variations)
        VALUES ($1, $2, $3::jsonb)
        RETURNING *;
      `,
      values: [
        cleanValues.group_id,
        cleanValues.product_group_item.product_id,
        JSON.stringify(cleanValues.product_group_item.variations),
      ],
    };

    const result = await database.query(query);
    return result.rows[0];
  } catch (error) {
    if (error.message && error.message.includes("product_group_items_pkey")) {
      throw new ValidationError({
        message: "Este produto já está adicionado neste grupo.",
      });
    }
    throw error;
  }
}

/**
 * Atualiza o JSON de variações de um produto que já está no grupo.
 */
async function updateItemVariations(groupId, productId, variations) {
  const cleanValues = validator(
    {
      group_id: groupId,
      product_group_item: { product_id: productId, variations },
    },
    { group_id: "required", product_group_item: "required" },
  );

  const query = {
    text: `
      UPDATE product_group_items 
      SET variations = $3::jsonb
      WHERE product_group_id = $1 AND product_id = $2
      RETURNING *;
    `,
    values: [
      cleanValues.group_id,
      cleanValues.product_group_item.product_id,
      JSON.stringify(cleanValues.product_group_item.variations),
    ],
  };

  const result = await database.query(query);
  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Produto não encontrado dentro deste grupo.",
    });
  }

  return result.rows[0];
}

/**
 * Remove um produto específico de um grupo.
 */
async function removeItem(groupId, productId) {
  const cleanValues = validator(
    { group_id: groupId, product_id: productId },
    { group_id: "required", product_id: "required" },
  );

  const query = {
    text: "DELETE FROM product_group_items WHERE product_group_id = $1 AND product_id = $2 RETURNING *;",
    values: [cleanValues.group_id, cleanValues.product_id],
  };

  const result = await database.query(query);
  if (result.rowCount === 0) {
    throw new NotFoundError({ message: "Vínculo não encontrado." });
  }

  return result.rows[0];
}

export default {
  create,
  findById,
  findBySlug,
  findAll,
  update,
  del,
  // Relações N:N
  addItem,
  updateItemVariations,
  removeItem,
};
