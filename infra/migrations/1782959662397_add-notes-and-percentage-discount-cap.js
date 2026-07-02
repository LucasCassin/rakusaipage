exports.up = async (pgm) => {
  await pgm.addColumns("pdv_sales", {
    notes: {
      type: "text",
      notNull: false,
      comment: "Observação livre da venda (ex: nome/telefone para sorteio).",
    },
  });

  await pgm.addColumns("pdv_settings", {
    max_discount_percentage: {
      type: "integer",
      notNull: false,
      comment:
        "Teto de desconto expresso em percentual do subtotal. Combinado com max_discount_in_cents, prevalece o que resultar no MENOR desconto.",
    },
  });

  await pgm.addConstraint(
    "pdv_settings",
    "pdv_settings_max_discount_percentage_chk",
    {
      check:
        "max_discount_percentage IS NULL OR (max_discount_percentage >= 0 AND max_discount_percentage <= 100)",
    },
  );
};

exports.down = async (pgm) => {
  await pgm.dropConstraint(
    "pdv_settings",
    "pdv_settings_max_discount_percentage_chk",
  );
  await pgm.dropColumns("pdv_settings", ["max_discount_percentage"]);
  await pgm.dropColumns("pdv_sales", ["notes"]);
};
