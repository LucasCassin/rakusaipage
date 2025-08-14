exports.up = (pgm) => {
  pgm.createTable("sessions", {
    session_id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },

    token: {
      type: "varchar(96)",
      notNull: true,
    },

    user_id: {
      type: "uuid",
      notNull: true,
    },

    expires_at: {
      type: "timestamptz",
      notNull: true,
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
};

exports.down = false;
