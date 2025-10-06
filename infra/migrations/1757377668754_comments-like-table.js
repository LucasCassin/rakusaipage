exports.up = (pgm) => {
  pgm.createTable(
    "comment_likes",
    {
      user_id: {
        type: "uuid",
        notNull: true,
        references: '"users"(id)',
        onDelete: "CASCADE",
      },
      comment_id: {
        type: "uuid",
        notNull: true,
        references: '"comments"(id)',
        onDelete: "CASCADE",
      },
      created_at: {
        type: "timestamptz",
        notNull: true,
        default: pgm.func("timezone('utc', now())"),
      },
    },
    {
      // Define a chave primária composta
      constraints: {
        primaryKey: ["user_id", "comment_id"],
      },
    },
  );
};

exports.down = false; // Migração irreversível
