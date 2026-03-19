exports.up = async (pgm) => {
  // Removemos a FK estrita para permitir guardar um array de dados históricos
  await pgm.dropColumn("orders", "applied_coupon_id");

  await pgm.addColumns("orders", {
    applied_coupons: {
      type: "jsonb",
      default: "[]",
      comment:
        "Lista de cupons aplicados com seus valores calculados no momento da compra",
    },
  });
};

exports.down = async (pgm) => {
  await pgm.dropColumn("orders", "applied_coupons");
  await pgm.addColumns("orders", {
    applied_coupon_id: { type: "uuid", default: null },
  });
};
