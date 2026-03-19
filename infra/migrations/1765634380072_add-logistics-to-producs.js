exports.up = async (pgm) => {
  await pgm.addColumns("products", {
    allow_delivery: {
      type: "boolean",
      default: false,
      notNull: true,
      comment: "Produto disponível para envio via transportadora/correios",
    },
    allow_pickup: {
      type: "boolean",
      default: true,
      notNull: true,
      comment: "Produto disponível para retirada no local",
    },
    pickup_address: {
      type: "text",
      default: null,
      comment: "Endereço completo para retirada (se aplicável)",
    },
    pickup_instructions: {
      type: "text",
      default: null,
      comment:
        "Instruções como: horário de funcionamento, procurar por fulano, etc.",
    },
  });
};

exports.down = async (pgm) => {
  await pgm.dropColumns("products", [
    "allow_delivery",
    "allow_pickup",
    "pickup_address",
    "pickup_instructions",
  ]);
};
