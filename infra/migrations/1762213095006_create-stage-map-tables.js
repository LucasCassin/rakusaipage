exports.up = (pgm) => {
  pgm.createType("scene_type_enum", ["FORMATION", "TRANSITION"]);

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
      onDelete: "SET NULL",
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
      onDelete: "CASCADE",
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"(id)',
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
  pgm.addConstraint(
    "presentation_viewers",
    "presentation_viewers_unique_pair",
    {
      unique: ["presentation_id", "user_id"],
    },
  );

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
      onDelete: "CASCADE",
    },
    order: { type: "integer", notNull: true },
    name: { type: "text", notNull: true },
    scene_type: { type: "scene_type_enum", notNull: true },
    description: { type: "text" },
  });

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
      onDelete: "CASCADE",
    },
    order: { type: "integer", notNull: true },
    description: { type: "text", notNull: true },
  });

  pgm.createTable("transition_step_assignees", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    transition_step_id: {
      type: "uuid",
      notNull: true,
      references: '"transition_steps"(id)',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"(id)',
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
  pgm.addConstraint(
    "transition_step_assignees",
    "transition_step_assignees_unique_pair",
    {
      unique: ["transition_step_id", "user_id"],
    },
  );

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

  pgm.createTable("element_groups", {
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
    display_name: { type: "text" },
  });

  pgm.createTable("element_group_assignees", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    element_group_id: {
      type: "uuid",
      notNull: true,
      references: '"element_groups"(id)',
      onDelete: "CASCADE",
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: '"users"(id)',
      onDelete: "CASCADE",
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
  pgm.addConstraint(
    "element_group_assignees",
    "element_group_assignees_unique_pair",
    {
      unique: ["element_group_id", "user_id"],
    },
  );

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
      onDelete: "RESTRICT",
    },
    group_id: {
      type: "uuid",
      notNull: true,
      references: '"element_groups"(id)',
      onDelete: "CASCADE",
    },
    position_x: { type: "float", notNull: true },
    position_y: { type: "float", notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("presentation_viewers");

  pgm.dropTable("transition_step_assignees");
  pgm.dropTable("transition_steps");

  pgm.dropTable("scene_elements");
  pgm.dropTable("element_group_assignees");
  pgm.dropTable("element_groups");

  pgm.dropTable("element_types");
  pgm.dropTable("scenes");
  pgm.dropTable("presentations");
  pgm.dropType("scene_type_enum");
};
