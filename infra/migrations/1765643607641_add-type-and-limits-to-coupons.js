exports.up = async (pgm) => {
  await pgm.addColumns("coupons", {
    type: {
      type: "varchar(20)",
      default: "subtotal", // 'subtotal' (padrão) ou 'shipping'
      notNull: true,
      comment:
        "Define se o desconto é aplicado no total dos produtos ou no frete",
    },
    max_discount_in_cents: {
      type: "integer",
      default: null,
      comment:
        "Valor máximo de desconto permitido (teto). Se NULL, sem limite.",
    },
  });
};

exports.down = async (pgm) => {
  await pgm.dropColumns("coupons", ["type", "max_discount_in_cents"]);
};
