exports.up = (pgm) => {
  // 1. Criar o tipo ENUM para as Cenas
  pgm.createType("scene_type_enum", ["FORMATION", "TRANSITION"]);

  // 2. Tabela de Apresentações (O Evento)
  pgm.createTable("presentations", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: { type: "text", notNull: true },
    date: { type: "timestamptz" },
    location: { type: "text" },
    meet_time: { type: "timestamptz" },
    meet_location: { type: "text" },
    description: { type: "text" },
    is_public: { type: "boolean", notNull: true, default: false },
    created_by_user_id: {
      type: "uuid",
      references: '"users"(id)',
      onDelete: "SET NULL", // Se o usuário for deletado, mantém a apresentação
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
  });

  // 3. Tabela de "Elenco" (Quem pode ver)
  pgm.createTable("presentation_viewers", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    presentation_id: {
      type: "uuid",
      notNull: true,
      references: '"presentations"(id)',
      onDelete: "CASCADE", // Se a apresentação for deletada, o elenco é limpo
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"(id)',
      onDelete: "CASCADE", // Se o usuário for deletado, ele sai do elenco
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
  // Índice para evitar duplicatas
  pgm.addConstraint(
    "presentation_viewers",
    "presentation_viewers_unique_pair",
    {
      unique: ["presentation_id", "user_id"],
    },
  );

  // 4. Tabela de Cenas (Músicas ou Transições)
  pgm.createTable("scenes", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    presentation_id: {
      type: "uuid",
      notNull: true,
      references: '"presentations"(id)',
      onDelete: "CASCADE", // Deleta as cenas se a apresentação for deletada
    },
    order: { type: "integer", notNull: true },
    name: { type: "text", notNull: true },
    scene_type: { type: "scene_type_enum", notNull: true },
    description: { type: "text" }, // Para notas da música (se for FORMATION)
  });

  // 5. Tabela de Passos da Transição (Checklist)
  pgm.createTable("transition_steps", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    scene_id: {
      type: "uuid",
      notNull: true,
      references: '"scenes"(id)',
      onDelete: "CASCADE", // Deleta os passos se a cena for deletada
    },
    order: { type: "integer", notNull: true },
    description: { type: "text", notNull: true },
    assigned_user_id: {
      type: "uuid",
      references: '"users"(id)',
      onDelete: "SET NULL", // Mantém o passo da transição, mas desvincula o usuário
    },
  });

  // 6. Tabela de Tipos de Elementos (O Catálogo de Ícones)
  pgm.createTable("element_types", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    name: { type: "text", notNull: true, unique: true },
    image_url: { type: "text", notNull: true },
    image_url_highlight: { type: "text" },
    scale: { type: "float", notNull: true, default: 1.0 },
  });

  // 7. Tabela de Elementos da Cena (O Ponto no Mapa)
  pgm.createTable("scene_elements", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    scene_id: {
      type: "uuid",
      notNull: true,
      references: '"scenes"(id)',
      onDelete: "CASCADE",
    },
    element_type_id: {
      type: "uuid",
      notNull: true,
      references: '"element_types"(id)',
      onDelete: "RESTRICT", // Impede deletar "Odaiko" se estiver em uso
    },
    position_x: { type: "float", notNull: true },
    position_y: { type: "float", notNull: true },
    display_name: { type: "text" }, // "Renan"
    assigned_user_id: {
      type: "uuid",
      references: '"users"(id)',
      onDelete: "SET NULL", // Mantém o elemento no mapa, mas desvincula o usuário
    },
  });
};

exports.down = false;
