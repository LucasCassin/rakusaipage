exports.up = (pgm) => {
  pgm.createTable("comments", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    content: {
      type: "text",
      notNull: true,
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"(id)', // Referencia a tabela 'users'
      onDelete: "CASCADE",
    },
    video_id: {
      type: "text",
      notNull: true,
    },
    parent_id: {
      type: "uuid",
      references: '"comments"(id)', // Auto-referência para respostas
      onDelete: "CASCADE",
    },
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
    deleted_at: {
      type: "timestamptz", // Para soft deletes
    },
  });
};

exports.down = false;
