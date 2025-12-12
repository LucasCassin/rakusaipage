import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError, ValidationError } from "errors/index.js";

/**
 * Helper para decidir qual cliente usar (Pool ou Transação).
 */
function getQueryRunner(transactionClient) {
  return transactionClient || database;
}

async function getOrCreate(userId, transactionClient) {
  const cleanId = validator({ id: userId }, { id: "required" }).id;
  const client = getQueryRunner(transactionClient);

  const result = await client.query({
    text: "SELECT * FROM carts WHERE user_id = $1;",
    values: [cleanId],
  });

  if (result.rowCount > 0) {
    return result.rows[0];
  }

  const createResult = await client.query({
    text: "INSERT INTO carts (user_id) VALUES ($1) RETURNING *;",
    values: [cleanId],
  });

  return createResult.rows[0];
}

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

  const itemCheck = await database.query({
    text: "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2;",
    values: [cart.id, cleanValues.product_id],
  });

  if (itemCheck.rowCount > 0) {
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

async function updateItemQuantity(userId, productId, quantity) {
  const cleanValues = validator(
    { user_id: userId, product_id: productId, cart_quantity: quantity },
    { user_id: "required", product_id: "required", cart_quantity: "required" },
  );

  if (cleanValues.cart_quantity <= 0) {
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

async function getCart(userId, transactionClient) {
  const client = getQueryRunner(transactionClient);
  const cart = await getOrCreate(userId, transactionClient);

  // QUERY ALTERADA: Adicionado p.minimum_price_in_cents
  const query = {
    text: `
      SELECT 
        ci.id as item_id,
        ci.product_id,
        ci.quantity,
        ci.created_at,
        p.name,
        p.slug,
        p.price_in_cents,
        p.promotional_price_in_cents,
        p.minimum_price_in_cents, 
        p.images,
        p.stock_quantity,
        p.is_active
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC;
    `,
    values: [cart.id],
  };

  const itemsResult = await client.query(query);

  const items = itemsResult.rows.map((item) => {
    const unitPrice = item.promotional_price_in_cents || item.price_in_cents;
    return {
      ...item,
      unit_price_in_cents: unitPrice,
      total_in_cents: unitPrice * item.quantity,
      // Total Mínimo deste item = (Preço Mínimo Unitário * Quantidade)
      total_minimum_in_cents:
        (item.minimum_price_in_cents || 0) * item.quantity,
    };
  });

  const grandTotal = items.reduce((acc, item) => acc + item.total_in_cents, 0);

  return {
    ...cart,
    items,
    total_in_cents: grandTotal,
  };
}

async function clearCart(userId, transactionClient) {
  const client = getQueryRunner(transactionClient);
  const cart = await getOrCreate(userId, transactionClient);

  await client.query({
    text: "DELETE FROM cart_items WHERE cart_id = $1;",
    values: [cart.id],
  });
}

/**
 * Sincroniza/Funde um carrinho local (array de itens) com o carrinho do banco.
 * Usado quando o usuário faz Login.
 * @param {string} userId - ID do usuário.
 * @param {Array} localItems - Array de objetos [{ product_id, quantity }, ...].
 */
async function syncLocalCart(userId, localItems) {
  // Se não tem itens para sincronizar, retorna o carrinho atual
  if (!localItems || localItems.length === 0) {
    return getCart(userId);
  }

  const client = await database.getNewClient();

  try {
    await client.query("BEGIN"); // Inicia Transação para garantir integridade

    const cart = await getOrCreate(userId, client);

    for (const item of localItems) {
      const { product_id: product_id_p, quantity: quantity_p } = item;
      const cleanValues = validator(
        { product_id: product_id_p, cart_quantity: quantity_p },
        { product_id: "required", cart_quantity: "required" },
      );
      const product_id = cleanValues.product_id;
      const quantity = cleanValues.cart_quantity;

      // Validação básica
      if (!product_id || quantity <= 0) continue;

      // Verifica se já existe no banco
      const itemCheck = await client.query({
        text: "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2;",
        values: [cart.id, product_id],
      });

      if (itemCheck.rowCount > 0) {
        // MERGE: Se já existe, SOMA a quantidade local com a do banco
        const currentQuantity = itemCheck.rows[0].quantity;
        const newQuantity = currentQuantity + quantity;

        await client.query({
          text: `
            UPDATE cart_items 
            SET quantity = $1, updated_at = (now() at time zone 'utc')
            WHERE id = $2;
          `,
          values: [newQuantity, itemCheck.rows[0].id],
        });
      } else {
        // INSERT: Se não existe, cria
        await client.query({
          text: `
            INSERT INTO cart_items (cart_id, product_id, quantity)
            VALUES ($1, $2, $3);
          `,
          values: [cart.id, product_id, quantity],
        });
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (!error.code) {
      throw error; // Erros de validação (limite, etc)
    } else {
      throw database.handleDatabaseError(error);
    }
  } finally {
    client.end();
  }

  // Retorna o carrinho consolidado
  return getCart(userId);
}

export default {
  getOrCreate,
  addItem,
  removeItem,
  updateItemQuantity,
  getCart,
  clearCart,
  syncLocalCart,
};
