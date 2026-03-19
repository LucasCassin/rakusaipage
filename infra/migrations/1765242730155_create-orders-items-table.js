exports.up = async (pgm) => {
  await pgm.createTable("order_items", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    order_id: {
      type: "uuid",
      notNull: true,
      references: '"orders"',
      onDelete: "CASCADE",
    },
    product_id: {
      type: "uuid",
      notNull: true,
      references: '"products"',
      onDelete: "RESTRICT",
    },
    product_name_snapshot: { type: "varchar(255)", notNull: true },
    quantity: { type: "integer", notNull: true },
    unit_price_in_cents: { type: "integer", notNull: true },
    total_in_cents: { type: "integer", notNull: true },
  });

  await pgm.createIndex("order_items", "order_id");
};

exports.down = async (pgm) => {
  await pgm.dropTable("order_items");
};
