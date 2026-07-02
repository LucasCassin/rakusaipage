exports.up = async (pgm) => {
  await pgm.createTable("pdv_sale_items", {
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
    product_id: {
      type: "uuid",
      notNull: true,
      references: '"pdv_products"',
      onDelete: "RESTRICT",
    },
    product_name_snapshot: { type: "varchar(255)", notNull: true },
    unit_price_in_cents: {
      type: "integer",
      notNull: true,
      check: "unit_price_in_cents >= 0",
    },
    quantity: { type: "integer", notNull: true, check: "quantity > 0" },
    total_in_cents: {
      type: "integer",
      notNull: true,
      check: "total_in_cents >= 0",
    },
    created_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });

  await pgm.createIndex("pdv_sale_items", "sale_id");
  await pgm.createIndex("pdv_sale_items", "product_id");
};

exports.down = async (pgm) => {
  await pgm.dropTable("pdv_sale_items");
};
