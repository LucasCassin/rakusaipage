exports.up = async (pgm) => {
  await pgm.createTable("products", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    name: { type: "varchar(255)", notNull: true },
    slug: { type: "varchar(255)", notNull: true, unique: true },
    description: { type: "text", notNull: true },
    category: { type: "varchar(100)", notNull: true },
    tags: { type: "text[]", default: "{}" },

    // PRECIFICAÇÃO E SEGURANÇA
    price_in_cents: { type: "integer", notNull: true },
    promotional_price_in_cents: { type: "integer", notNull: false },

    // Novo campo solicitado: O "Hard Floor". O produto nunca será vendido abaixo disso.
    minimum_price_in_cents: {
      type: "integer",
      notNull: true,
      default: 0,
      comment:
        "Valor mínimo absoluto de venda, ignorando quaisquer cupons ou regras.",
    },

    stock_quantity: { type: "integer", notNull: true, default: 0 },
    purchase_limit_per_user: { type: "integer", notNull: false },

    // REGRAS DE ACESSO
    allowed_features: { type: "text[]", default: "{}" },
    available_at: { type: "timestamp with time zone", notNull: false },
    unavailable_at: { type: "timestamp with time zone", notNull: false },
    is_active: { type: "boolean", notNull: true, default: true },

    // LOGÍSTICA
    production_days: { type: "integer", default: 0 },
    weight_in_grams: { type: "integer", notNull: true },
    length_cm: { type: "integer", notNull: true },
    height_cm: { type: "integer", notNull: true },
    width_cm: { type: "integer", notNull: true },

    image_url: { type: "varchar(500)", notNull: false },
    created_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
    updated_at: {
      type: "timestamp with time zone",
      default: pgm.func("(now() at time zone 'utc')"),
    },
  });

  await pgm.createIndex("products", "slug");
  await pgm.createIndex("products", "category");
};

exports.down = async (pgm) => {
  await pgm.dropTable("products");
};
