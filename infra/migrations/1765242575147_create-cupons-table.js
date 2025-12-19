exports.up = async (pgm) => {
  await pgm.createTable("coupons", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    code: { type: "varchar(50)", notNull: false, unique: true },
    description: { type: "text", notNull: true },
    discount_percentage: { type: "integer", notNull: true },
    auto_apply_feature: { type: "varchar(255)", notNull: false },
    min_purchase_value_in_cents: { type: "integer", default: 0 },
    usage_limit_global: { type: "integer", notNull: false },
    usage_limit_per_user: { type: "integer", default: 1 },
    is_cumulative: { type: "boolean", default: false },
    expiration_date: { type: "timestamp with time zone", notNull: false },
    is_active: { type: "boolean", default: true },
    created_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
    updated_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });
};

exports.down = async (pgm) => {
  await pgm.dropTable("coupons");
};
