exports.up = async (pgm) => {
  await pgm.addColumns("orders", {
    gateway_data: {
      type: "jsonb",
      default: "{}",
      comment: "Armazena dados brutos do gateway (QR Code, Links, Metadados)",
    },
  });
};

exports.down = async (pgm) => {
  await pgm.dropColumns("orders", ["gateway_data"]);
};
