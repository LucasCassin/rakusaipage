exports.up = async (pgm) => {
  await pgm.createTable("pdv_payment_methods", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    name: { type: "varchar(100)", notNull: true, unique: true },
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

  await pgm.createTable("pdv_payment_method_variants", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    payment_method_id: {
      type: "uuid",
      notNull: true,
      references: '"pdv_payment_methods"',
      onDelete: "RESTRICT",
    },
    name: { type: "varchar(100)", notNull: true },
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

  await pgm.createIndex(
    "pdv_payment_method_variants",
    ["payment_method_id", "name"],
    {
      unique: true,
    },
  );
};

exports.down = async (pgm) => {
  await pgm.dropTable("pdv_payment_method_variants");
  await pgm.dropTable("pdv_payment_methods");
};
