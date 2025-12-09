/* Arquivo: infra/migrations/1765000000000_create-products-table.js */

exports.up = async (pgm) => {
  await pgm.createTable("products", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },

    // --- Identificação e SEO ---
    name: {
      type: "varchar(255)",
      notNull: true,
    },
    slug: {
      type: "varchar(255)",
      notNull: true,
      unique: true, // Garante URLs únicas
      comment: "URL amigável do produto (ex: camiseta-festival-2024)",
    },
    description: {
      type: "text",
      notNull: true,
    },
    category: {
      type: "varchar(100)",
      notNull: true,
    },
    tags: {
      type: "text[]",
      default: "{}",
    },

    // --- Preço e Promoção ---
    price_in_cents: {
      // Preço "Cheio" (List Price)
      type: "integer",
      notNull: true,
    },
    promotional_price_in_cents: {
      // Preço "Atual" se estiver em oferta (Sale Price)
      type: "integer",
      notNull: false, // Se NULL, vale o price_in_cents
      comment: "Se preenchido e menor que price, mostra o preço De/Por",
    },

    // --- Estoque e Limites ---
    stock_quantity: {
      type: "integer",
      notNull: true,
      default: 0,
    },
    purchase_limit_per_user: {
      type: "integer",
      notNull: false,
      comment:
        "Quantidade máxima que um único usuário pode comprar (anti-cambista ou cota)",
    },

    // --- Regras de Visibilidade e Acesso (Suas sugestões) ---
    allowed_features: {
      type: "text[]",
      default: "{}",
      comment:
        "Lista de features necessárias para VER e COMPRAR. Se vazio {}, é público.",
    },
    available_at: {
      type: "timestamp with time zone",
      notNull: false,
      comment:
        'Data de lançamento. Antes disso, o produto fica oculto ou como "Em breve"',
    },
    unavailable_at: {
      type: "timestamp with time zone",
      notNull: false,
      comment: "Data de encerramento das vendas (mesmo se tiver estoque)",
    },
    is_active: {
      type: "boolean",
      notNull: true,
      default: true,
      comment: "Kill switch manual para esconder o produto imediatamente",
    },

    // --- Logística ---
    production_days: { type: "integer", default: 0 },
    weight_in_grams: { type: "integer", notNull: true },
    length_cm: { type: "integer", notNull: true },
    height_cm: { type: "integer", notNull: true },
    width_cm: { type: "integer", notNull: true },

    // --- Mídia ---
    image_url: {
      type: "varchar(500)",
      notNull: false,
    },

    // --- Auditoria ---
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

  // Índices para performance
  await pgm.createIndex("products", "slug"); // Busca por URL
  await pgm.createIndex("products", "category"); // Filtros de categoria
  await pgm.createIndex("products", "is_active"); // Filtro de ativos
};

exports.down = false;
