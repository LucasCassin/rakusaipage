exports.up = async (pgm) => {
  await pgm.createTable("pdv_sale_payments", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    sale_id: {
      type: "uuid",
      notNull: true,
      references: '"pdv_sales"',
      onDelete: "CASCADE",
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
    amount_in_cents: {
      type: "integer",
      notNull: true,
      check: "amount_in_cents >= 0",
      comment: "Parcela do total da venda paga por esta forma de pagamento.",
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
    created_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });

  await pgm.createIndex("pdv_sale_payments", "sale_id");
  await pgm.createIndex("pdv_sale_payments", "payment_method_id");
  await pgm.createIndex("pdv_sale_payments", "payment_method_variant_id");

  // Uma venda agora pode ser paga em mais de uma forma de pagamento (ex:
  // metade no Pix, metade em dinheiro) — os campos de pagamento migram de
  // `pdv_sales` (um único pagamento por venda) para `pdv_sale_payments`
  // (um-para-muitos).
  await pgm.dropColumns("pdv_sales", [
    "payment_method_id",
    "payment_method_name_snapshot",
    "payment_method_variant_id",
    "payment_method_variant_name_snapshot",
    "cash_given_in_cents",
    "change_in_cents",
  ]);
};

exports.down = async (pgm) => {
  await pgm.addColumns("pdv_sales", {
    payment_method_id: {
      type: "uuid",
      notNull: false,
      references: '"pdv_payment_methods"',
      onDelete: "RESTRICT",
    },
    payment_method_name_snapshot: { type: "varchar(100)", notNull: false },
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
  });

  await pgm.createIndex("pdv_sales", "payment_method_id");
  await pgm.createIndex("pdv_sales", "payment_method_variant_id");

  await pgm.dropTable("pdv_sale_payments");
};
