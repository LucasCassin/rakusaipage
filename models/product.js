import database from "infra/database.js";
import validator from "models/validator.js";
import { ValidationError, NotFoundError } from "errors/index.js";

/**
 * Cria um novo produto na loja.
 * @param {Object} productData - Dados do produto.
 * @returns {Promise<Object>} - O produto criado.
 */
async function create(productData) {
  // 1. Validação
  const cleanValues = validator(
    { ...productData, shop_images: productData.images },
    {
      name: "required",
      slug: "required",
      description: "required",
      category: "required",
      price_in_cents: "required",
      minimum_price_in_cents: "required",
      stock_quantity: "required",
      weight_in_grams: "required",
      length_cm: "required",
      height_cm: "required",
      width_cm: "required",
      // Campos opcionais mas validados se presentes
      promotional_price_in_cents: "optional",
      purchase_limit_per_user: "optional",
      production_days: "optional",
      shop_images: "optional", // Array de objetos { url, alt, is_cover }
      tags: "optional",
      allowed_features: "optional",
      available_at: "optional",
      unavailable_at: "optional",
      is_active: "optional",
    },
  );

  // 2. Persistência
  const query = {
    text: `
      INSERT INTO products (
        name, slug, description, category, tags,
        price_in_cents, promotional_price_in_cents, minimum_price_in_cents,
        stock_quantity, purchase_limit_per_user,
        allowed_features, available_at, unavailable_at, is_active,
        production_days, weight_in_grams, length_cm, height_cm, width_cm,
        images
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
        $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18, $19,
        $20
      ) RETURNING *;
    `,
    values: [
      cleanValues.name,
      cleanValues.slug,
      cleanValues.description,
      cleanValues.category,
      cleanValues.tags || [],
      cleanValues.price_in_cents,
      cleanValues.promotional_price_in_cents || null,
      cleanValues.minimum_price_in_cents,
      cleanValues.stock_quantity,
      cleanValues.purchase_limit_per_user || null,
      cleanValues.allowed_features || [],
      cleanValues.available_at || null,
      cleanValues.unavailable_at || null,
      cleanValues.is_active ?? true, // Default true se undefined
      cleanValues.production_days || 0,
      cleanValues.weight_in_grams,
      cleanValues.length_cm,
      cleanValues.height_cm,
      cleanValues.width_cm,
      JSON.stringify(cleanValues.shop_images || []),
    ],
  };

  try {
    const result = await database.query(query);
    return result.rows[0];
  } catch (error) {
    if (
      (error.cause = `duplicate key value violates unique constraint "products_slug_key"`)
    ) {
      throw new ValidationError({
        message: "Já existe um produto com este slug (URL).",
        action: "Escolha um nome diferente ou altere o slug manualmente.",
      });
    }
    throw error;
  }
}

/**
 * Busca um produto pelo ID.
 */
async function findById(id) {
  const cleanId = validator({ id }, { id: "required" }).id;

  const result = await database.query({
    text: "SELECT * FROM products WHERE id = $1;",
    values: [cleanId],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Produto não encontrado.",
      action: "Verifique o ID informado.",
    });
  }

  return result.rows[0];
}

/**
 * Busca um produto pelo Slug (usado na vitrine pública).
 * Não filtra is_active aqui pois o admin pode querer ver preview.
 * O filtro de visibilidade deve ser feito no Controller/Service.
 */
async function findBySlug(slug) {
  const cleanSlug = validator({ slug }, { slug: "required" }).slug;

  const result = await database.query({
    text: "SELECT * FROM products WHERE slug = $1;",
    values: [cleanSlug],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Produto não encontrado.",
      action: "Verifique a URL acessada.",
    });
  }

  return result.rows[0];
}

/**
 * Lista produtos com filtros básicos.
 * @param {Object} options - Filtros (limit, offset, category, isActive).
 */
async function findAll({ limit = 20, offset = 0, category, isActive } = {}) {
  if (category || isActive) {
    const validateData = validator(
      { category, is_active: isActive },
      {
        category: "optional",
        is_active: "optional",
      },
    );
    category = validateData.category;
    isActive = validateData.is_active;
  }

  const values = [limit, offset];
  let whereClause = "WHERE 1=1";
  let paramIndex = 3;

  if (category) {
    whereClause += ` AND category = $${paramIndex}`;
    values.push(category);
    paramIndex++;
  }

  if (isActive !== undefined) {
    whereClause += ` AND is_active = $${paramIndex}`;
    values.push(isActive);
    paramIndex++;
  }

  const query = {
    text: `
      SELECT *, count(*) OVER() as total_count
      FROM products
      ${whereClause}
      ORDER BY created_at DESC
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
 * Atualiza um produto existente.
 */
async function update(id, productData) {
  const cleanId = validator({ id }, { id: "required" }).id;

  // 1. Mapeamento "Front -> Validator"
  // (Transforma nomes do front nos nomes que o validator espera)
  const mappedData = { ...productData };

  if (mappedData.images !== undefined) {
    mappedData.shop_images = mappedData.images;
    delete mappedData.images;
  }

  if (mappedData.status !== undefined) {
    mappedData.shop_status = mappedData.status;
    delete mappedData.status;
  }

  // 2. Monta o schema com chaves do Validator
  const validationKeys = {};
  Object.keys(mappedData).forEach((key) => {
    validationKeys[key] = "optional";
  });

  // 3. Validação
  // cleanValues agora tem chaves como 'shop_images' e 'shop_status'
  const cleanValues = validator(mappedData, validationKeys);

  if (Object.keys(cleanValues).length === 0) {
    throw new ValidationError({
      message: "Nenhum dado válido para atualização.",
    });
  }

  // --- AQUI É A PARTE NOVA ---
  // 4. Mapeamento Reverso "Validator -> Banco de Dados"
  // (Volta para os nomes das colunas reais da tabela)

  if (cleanValues.shop_images !== undefined) {
    cleanValues.images = cleanValues.shop_images;
    delete cleanValues.shop_images; // Remove a chave do validator
  }

  if (cleanValues.shop_status !== undefined) {
    cleanValues.status = cleanValues.shop_status;
    delete cleanValues.shop_status; // Remove a chave do validator
  }
  // ---------------------------

  // 5. Construção dinâmica da query UPDATE
  // Agora o loop vai encontrar as chaves "images" e "status" corretamente
  const sets = [];
  const values = [cleanId];
  let paramIndex = 2;

  Object.entries(cleanValues).forEach(([key, value]) => {
    // Como renomeamos de volta para "images", essa verificação vai funcionar
    if (key === "images") {
      value = JSON.stringify(value);
    }

    // A chave aqui será "images" ou "status", que são as colunas do banco
    sets.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  const query = {
    text: `
      UPDATE products
      SET ${sets.join(", ")}, updated_at = (now() at time zone 'utc')
      WHERE id = $1
      RETURNING *;
    `,
    values,
  };

  const result = await database.query(query);

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Produto não encontrado para atualização.",
    });
  }

  return result.rows[0];
}

export default {
  create,
  findById,
  findBySlug,
  findAll,
  update,
};
