exports.up = async (pgm) => {
  await pgm.addColumns("orders", {
    shipping_method: {
      type: "varchar(50)", // ex: "PAC", "SEDEX", "PICKUP"
      default: "STANDARD",
    },
    shipping_details: {
      type: "jsonb", // Snapshot do endereço de retirada ou dados da transportadora
      default: "{}",
    },
  });
};

exports.down = async (pgm) => {
  await pgm.dropColumns("orders", ["shipping_method", "shipping_details"]);
};
