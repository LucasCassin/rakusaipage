exports.up = async (pgm) => {
  await pgm.addColumns("products", {
    is_digital: {
      type: "boolean",
      default: false,
      notNull: true,
      comment: "Se true, é um produto digital (sem frete físico)",
    },
  });
};

exports.down = async (pgm) => {
  await pgm.dropColumns("products", ["is_digital"]);
};
