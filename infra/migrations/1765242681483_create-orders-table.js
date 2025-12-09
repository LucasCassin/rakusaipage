exports.up = async (pgm) => {
  await pgm.createTable("orders", {
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
      onDelete: "RESTRICT",
    },
    subtotal_in_cents: { type: "integer", notNull: true },
    discount_in_cents: { type: "integer", default: 0 },
    shipping_cost_in_cents: { type: "integer", default: 0 },
    total_in_cents: { type: "integer", notNull: true },

    payment_gateway_id: { type: "varchar(255)" },
    payment_method: { type: "varchar(50)", default: "pix" },

    // AQUI: Usamos VARCHAR com Check Constraint para segurança + flexibilidade
    status: {
      type: "varchar(50)",
      notNull: true,
      default: "pending",
      check:
        "status IN ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'canceled', 'refunded')",
    },

    tracking_code: { type: "varchar(100)" },
    shipping_address_snapshot: { type: "jsonb", notNull: true },
    applied_coupon_id: {
      type: "uuid",
      references: '"coupons"',
      notNull: false,
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

  await pgm.createIndex("orders", "user_id");
  await pgm.createIndex("orders", "status");
};

exports.down = async (pgm) => {
  await pgm.dropTable("orders");
};
