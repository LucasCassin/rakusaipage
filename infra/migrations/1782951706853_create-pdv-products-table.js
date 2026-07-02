exports.up = async (pgm) => {
  await pgm.createTable("pdv_products", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    name: { type: "varchar(255)", notNull: true },
    price_in_cents: {
      type: "integer",
      notNull: true,
      check: "price_in_cents >= 0",
    },
    stock_quantity: { type: "integer", notNull: true, default: 0 },

    // Piso: nunca vender a unidade abaixo deste valor após desconto
    min_unit_price_in_cents: {
      type: "integer",
      notNull: true,
      default: 0,
      check: "min_unit_price_in_cents >= 0",
      comment:
        "Valor mínimo absoluto de venda por unidade, mesmo com desconto aplicado.",
    },

    // Sugestão de desconto exibida na tela do caixa; não é aplicada automaticamente
    default_discount_type: {
      type: "varchar(20)",
      notNull: false,
      check:
        "default_discount_type IS NULL OR default_discount_type IN ('percentage', 'fixed')",
    },
    default_discount_value: { type: "integer", notNull: false },

    allow_negative_stock: { type: "boolean", notNull: true, default: false },
    max_negative_stock: {
      type: "integer",
      notNull: false,
      check: "max_negative_stock IS NULL OR max_negative_stock >= 0",
      comment:
        "Quantidade máxima que o estoque pode ficar negativo, quando permitido.",
    },

    is_active: { type: "boolean", notNull: true, default: true },

    created_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
    updated_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });

  // Defesa em profundidade contra o padrão de corrida inseguro visto em `products.stock_quantity`:
  // o decremento atômico em `pdv_product.adjustStock` já garante isso, mas a constraint impede
  // que qualquer bug futuro deixe o estoque em um estado inválido.
  await pgm.addConstraint("pdv_products", "pdv_products_stock_floor_chk", {
    check: "allow_negative_stock = true OR stock_quantity >= 0",
  });
  await pgm.addConstraint(
    "pdv_products",
    "pdv_products_max_negative_floor_chk",
    {
      check:
        "max_negative_stock IS NULL OR stock_quantity >= -max_negative_stock",
    },
  );

  await pgm.createIndex("pdv_products", "name");
  await pgm.createIndex("pdv_products", "is_active");
};

exports.down = async (pgm) => {
  await pgm.dropTable("pdv_products");
};
