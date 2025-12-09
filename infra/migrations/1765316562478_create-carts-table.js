/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 1. Tabela de Carrinho (Sessão persistente do usuário)
  await pgm.createTable("carts", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "CASCADE",
      unique: true, // Garante 1 carrinho ativo por usuário
    },
    // Controle de "última vez modificado" para limpeza automática de carrinhos velhos se necessário
    created_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
    updated_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });

  // 2. Itens do Carrinho
  await pgm.createTable("cart_items", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    cart_id: {
      type: "uuid",
      notNull: true,
      references: '"carts"',
      onDelete: "CASCADE",
    },
    product_id: {
      type: "uuid",
      notNull: true,
      references: '"products"',
      onDelete: "CASCADE",
    },
    quantity: {
      type: "integer",
      notNull: true,
      default: 1,
      check: "quantity > 0", // Impede quantidades negativas ou zero
    },
    created_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
    updated_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });

  // Performance e Integridade:
  // Garante que o mesmo produto não apareça duplicado em linhas diferentes do mesmo carrinho
  await pgm.createIndex("cart_items", ["cart_id", "product_id"], {
    unique: true,
  });
};

exports.down = async (pgm) => {
  await pgm.dropTable("cart_items");
  await pgm.dropTable("carts");
};
