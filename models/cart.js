import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ValidationError } from "errors/index.js";

/**
 * Busca ou cria um carrinho ativo para o usuário.
 * Garante que sempre haverá um ID de carrinho para operar.
 */
async function getOrCreate(userId) {
  const cleanId = validator({ id: userId }, { id: "required" }).id;

  // 1. Tenta buscar existente
  const result = await database.query({
    text: "SELECT * FROM carts WHERE user_id = $1;",
    values: [cleanId],
  });

  if (result.rowCount > 0) {
    return result.rows[0];
  }

  // 2. Se não existir, cria um novo
  const createResult = await database.query({
    text: "INSERT INTO carts (user_id) VALUES ($1) RETURNING *;",
    values: [cleanId],
  });

  return createResult.rows[0];
}

/**
 * Adiciona um item ao carrinho.
 * Se o item já existir, incrementa a quantidade.
 */
async function addItem(userId, itemData) {
  const cleanValues = validator(
    {
      product_id: itemData.product_id,
      user_id: userId,
      cart_quantity: itemData.quantity,
    },
    {
      user_id: "required",
      product_id: "required",
      cart_quantity: "required",
    },
  );

  if (cleanValues.cart_quantity <= 0) {
    throw new ValidationError({
      message: "A quantidade deve ser maior que zero.",
    });
  }

  const cart = await getOrCreate(cleanValues.user_id);

  // Verifica se o produto já está no carrinho deste usuário
  const itemCheck = await database.query({
    text: "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2;",
    values: [cart.id, cleanValues.product_id],
  });

  if (itemCheck.rowCount > 0) {
    // CENÁRIO A: Item já existe -> Soma a quantidade
    const currentQuantity = itemCheck.rows[0].quantity;
    const newQuantity = currentQuantity + cleanValues.cart_quantity;

    const updateResult = await database.query({
      text: `
        UPDATE cart_items 
        SET quantity = $1, updated_at = (now() at time zone 'utc')
        WHERE id = $2
        RETURNING *;
      `,
      values: [newQuantity, itemCheck.rows[0].id],
    });
    return updateResult.rows[0];
  } else {
    // CENÁRIO B: Item novo -> Insere
    const insertResult = await database.query({
      text: `
        INSERT INTO cart_items (cart_id, product_id, quantity)
        VALUES ($1, $2, $3)
        RETURNING *;
      `,
      values: [cart.id, cleanValues.product_id, cleanValues.cart_quantity],
    });
    return insertResult.rows[0];
  }
}

/**
 * Remove um item completamente do carrinho.
 */
async function removeItem(userId, productId) {
  const cleanValues = validator(
    { user_id: userId, product_id: productId },
    { user_id: "required", product_id: "required" },
  );

  const cart = await getOrCreate(cleanValues.user_id);

  const result = await database.query({
    text: "DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 RETURNING *;",
    values: [cart.id, cleanValues.product_id],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Item não encontrado no carrinho.",
    });
  }

  return result.rows[0];
}

/**
 * Define uma quantidade específica (ex: usuário digitou "5" no input).
 */
async function updateItemQuantity(userId, productId, quantity) {
  const cleanValues = validator(
    { user_id: userId, product_id: productId, cart_quantity: quantity },
    { user_id: "required", product_id: "required", cart_quantity: "required" },
  );

  if (cleanValues.cart_quantity <= 0) {
    // Por segurança, vamos lançar erro, o front deve chamar removeItem se for 0.
    throw new ValidationError({
      message: "Quantidade inválida. Para remover, use a função de remover.",
    });
  }

  const cart = await getOrCreate(cleanValues.user_id);

  const result = await database.query({
    text: `
      UPDATE cart_items 
      SET quantity = $1, updated_at = (now() at time zone 'utc')
      WHERE cart_id = $2 AND product_id = $3
      RETURNING *;
    `,
    values: [cleanValues.cart_quantity, cart.id, cleanValues.product_id],
  });

  if (result.rowCount === 0) {
    throw new NotFoundError({
      message: "Produto não está no carrinho para ser atualizado.",
    });
  }

  return result.rows[0];
}

/**
 * Retorna o carrinho completo com detalhes dos produtos.
 */
async function getCart(userId) {
  const cart = await getOrCreate(userId);

  // Busca itens fazendo JOIN com products para pegar nome, preço e imagem
  const itemsResult = await database.query({
    text: `
      SELECT 
        ci.id,
        ci.product_id,
        ci.quantity,
        ci.created_at,
        p.name,
        p.slug,
        p.price_in_cents,
        p.promotional_price_in_cents,
        p.images,
        p.stock_quantity
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC;
    `,
    values: [cart.id],
  });

  // Calcula totais no backend para facilitar o front
  const items = itemsResult.rows.map((item) => {
    const price = item.promotional_price_in_cents || item.price_in_cents;
    return {
      ...item,
      total_in_cents: price * item.quantity,
    };
  });

  const grandTotal = items.reduce((acc, item) => acc + item.total_in_cents, 0);

  return {
    ...cart,
    items,
    total_in_cents: grandTotal,
  };
}

/**
 * Limpa o carrinho (após compra realizada).
 */
async function clearCart(userId) {
  const cart = await getOrCreate(userId);
  await database.query({
    text: "DELETE FROM cart_items WHERE cart_id = $1;",
    values: [cart.id],
  });
}

export default {
  getOrCreate,
  addItem,
  removeItem,
  updateItemQuantity,
  getCart,
  clearCart,
};
