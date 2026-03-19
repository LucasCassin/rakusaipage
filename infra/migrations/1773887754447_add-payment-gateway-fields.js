exports.up = async (pgm) => {
  await pgm.addColumns("payments", {
    payment_gateway_id: { type: "varchar(255)" },
    payment_gateway_status: { type: "varchar(50)" },
    payment_gateway_data: { type: "jsonb" },
  });

  await pgm.createIndex("payments", "payment_gateway_id");
};

exports.down = async (pgm) => {
  await pgm.dropIndex("payments", "payment_gateway_id");
  await pgm.dropColumns("payments", [
    "payment_gateway_id",
    "payment_gateway_status",
    "payment_gateway_data",
  ]);
};
