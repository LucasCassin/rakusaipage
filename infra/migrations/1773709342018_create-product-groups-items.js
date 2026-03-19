exports.up = async (pgm) => {
  await pgm.createTable("product_group_items", {
    product_group_id: {
      type: "uuid",
      notNull: true,
      references: '"product_groups"',
      onDelete: "CASCADE", // Se o grupo for apagado, remove as ligações
    },
    product_id: {
      type: "uuid",
      notNull: true,
      references: '"products"',
      onDelete: "CASCADE", // Se o produto físico for apagado, remove a ligação do grupo
    },
    variations: {
      type: "jsonb",
      default: "{}",
      notNull: true,
      comment: 'Exemplo: {"Tamanho": "G", "Cor": "Vermelha"}',
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

  // Chave Primária Composta (Garante que não se adiciona o mesmo produto duas vezes ao mesmo grupo)
  await pgm.addConstraint("product_group_items", "product_group_items_pkey", {
    primaryKey: ["product_group_id", "product_id"],
  });
};

exports.down = async (pgm) => {
  await pgm.dropTable("product_group_items");
};
