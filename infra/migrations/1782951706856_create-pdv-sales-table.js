exports.up = async (pgm) => {
  await pgm.createTable("pdv_sales", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    sale_number: {
      type: "bigserial",
      unique: true,
      notNull: true,
      comment: "Número de recibo legível, sequencial.",
    },
    seller_id: {
      type: "uuid",
      notNull: true,
      references: '"users"',
      onDelete: "RESTRICT",
    },

    subtotal_in_cents: {
      type: "integer",
      notNull: true,
      check: "subtotal_in_cents >= 0",
    },
    discount_type: {
      type: "varchar(20)",
      notNull: false,
      check:
        "discount_type IS NULL OR discount_type IN ('percentage', 'fixed')",
    },
    discount_value: { type: "integer", notNull: false },
    discount_in_cents: {
      type: "integer",
      notNull: true,
      default: 0,
      check: "discount_in_cents >= 0",
    },
    total_in_cents: {
      type: "integer",
      notNull: true,
      check: "total_in_cents >= 0",
    },

    payment_method_id: {
      type: "uuid",
      notNull: true,
      references: '"pdv_payment_methods"',
      onDelete: "RESTRICT",
    },
    payment_method_name_snapshot: { type: "varchar(100)", notNull: true },
    payment_method_variant_id: {
      type: "uuid",
      notNull: false,
      references: '"pdv_payment_method_variants"',
      onDelete: "RESTRICT",
    },
    payment_method_variant_name_snapshot: {
      type: "varchar(100)",
      notNull: false,
    },

    cash_given_in_cents: {
      type: "integer",
      notNull: false,
      check: "cash_given_in_cents IS NULL OR cash_given_in_cents >= 0",
    },
    change_in_cents: {
      type: "integer",
      notNull: false,
      check: "change_in_cents IS NULL OR change_in_cents >= 0",
    },

    status: {
      type: "varchar(20)",
      notNull: true,
      default: "completed",
      check: "status IN ('completed', 'cancelled')",
    },
    cancelled_at: { type: "timestamp with time zone", notNull: false },
    cancelled_by: {
      type: "uuid",
      notNull: false,
      references: '"users"',
      onDelete: "SET NULL",
    },
    cancel_reason: { type: "text", notNull: false },

    created_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });

  await pgm.createIndex("pdv_sales", "seller_id");
  await pgm.createIndex("pdv_sales", "created_at");
  await pgm.createIndex("pdv_sales", "payment_method_id");
  await pgm.createIndex("pdv_sales", "payment_method_variant_id");
  await pgm.createIndex("pdv_sales", "status");
};

exports.down = async (pgm) => {
  await pgm.dropTable("pdv_sales");
};
