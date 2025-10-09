exports.up = (pgm) => {
  // 1. Criar os tipos ENUM para padronizar os valores
  pgm.createType("period_unit_enum", ["day", "week", "month", "year"]);
  pgm.createType("payment_status_enum", ["PENDING", "CONFIRMED", "OVERDUE"]);

  // 2. Tabela de Planos (Templates)
  pgm.createTable("payment_plans", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: { type: "varchar(255)", notNull: true },
    description: { type: "text" },
    full_value: { type: "numeric(10, 2)", notNull: true },
    period_unit: { type: "period_unit_enum", notNull: true },
    period_value: { type: "integer", notNull: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  // 3. Tabela de Assinaturas (Usuário + Plano)
  pgm.createTable("user_subscriptions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"(id)',
      onDelete: "CASCADE",
    },
    plan_id: {
      type: "uuid",
      notNull: true,
      references: '"payment_plans"(id)',
      onDelete: "RESTRICT",
    },
    discount_value: { type: "numeric(10, 2)", notNull: true, default: 0.0 },
    payment_day: { type: "integer", notNull: true },
    start_date: { type: "date", notNull: true },
    is_active: { type: "boolean", notNull: true, default: true },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  // 4. Tabela de Pagamentos (Cobranças Individuais)
  pgm.createTable("payments", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    subscription_id: {
      type: "uuid",
      notNull: true,
      references: '"user_subscriptions"(id)',
      onDelete: "CASCADE",
    },
    due_date: { type: "date", notNull: true },
    amount_due: { type: "numeric(10, 2)", notNull: true },
    status: { type: "payment_status_enum", notNull: true, default: "PENDING" },
    user_notified_payment: { type: "boolean", notNull: true, default: false },
    user_notified_at: { type: "timestamptz" },
    confirmed_at: { type: "timestamptz" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  // 5. Adicionar índices para otimizar as buscas
  pgm.createIndex("user_subscriptions", "user_id");
  pgm.createIndex("user_subscriptions", "plan_id");
  pgm.createIndex("payments", "subscription_id");
  pgm.createIndex("payments", "due_date");
  pgm.createIndex("payments", "status");
};

exports.down = false;
