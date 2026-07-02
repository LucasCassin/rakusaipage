exports.up = async (pgm) => {
  await pgm.createTable("pdv_settings", {
    // Truque de "tabela singleton": PK booleana travada em `true` via CHECK,
    // garante que a tabela nunca tenha mais de uma linha.
    singleton: { type: "boolean", primaryKey: true, default: true },

    default_cart_discount_type: {
      type: "varchar(20)",
      notNull: false,
      check:
        "default_cart_discount_type IS NULL OR default_cart_discount_type IN ('percentage', 'fixed')",
    },
    default_cart_discount_value: { type: "integer", notNull: false },

    min_cart_value_in_cents: {
      type: "integer",
      notNull: true,
      default: 0,
      check: "min_cart_value_in_cents >= 0",
      comment:
        "Piso: o desconto do carrinho nunca pode derrubar o total abaixo deste valor.",
    },
    max_discount_in_cents: {
      type: "integer",
      notNull: false,
      comment:
        "Teto de desconto aplicável no fechamento do carrinho. NULL = sem limite.",
    },

    updated_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });

  await pgm.addConstraint("pdv_settings", "pdv_settings_singleton_chk", {
    check: "singleton = true",
  });

  await pgm.sql("INSERT INTO pdv_settings (singleton) VALUES (true);");
};

exports.down = async (pgm) => {
  await pgm.dropTable("pdv_settings");
};
