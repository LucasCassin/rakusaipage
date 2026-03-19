exports.up = async (pgm) => {
  await pgm.createTable("product_groups", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    slug: {
      type: "varchar(255)",
      notNull: true,
      unique: true,
    },
    description: {
      type: "text",
    },
    images: {
      type: "jsonb",
      default: "[]",
      notNull: true,
      comment: "Array de URLs de imagens para a vitrine do grupo",
    },
    is_active: {
      type: "boolean",
      default: true,
      notNull: true,
    },
    created_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("(now() at time zone 'utc')"),
    },
    updated_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });
};

exports.down = async (pgm) => {
  await pgm.dropTable("product_groups");
};
