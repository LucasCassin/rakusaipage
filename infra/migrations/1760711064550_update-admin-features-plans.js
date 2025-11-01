const featuresToAdd = [
  "create:payment_plan",
  "read:payment_plan",
  "update:payment_plan",
  "delete:payment_plan",
  "create:subscription",
  "read:subscription:self",
  "read:subscription:other",
  "update:subscription",
  "delete:subscription",
  "read:payment:self",
  "read:payment:other",
  "update:payment:indicate_paid",
  "update:payment:confirm_paid",
];

exports.up = (pgm) => {
  // Converte o array de features para o formato SQL ARRAY['feature1', 'feature2']
  const featuresSqlArray = `ARRAY[${featuresToAdd.map((f) => `'${f}'`).join(", ")}]`;

  pgm.sql(`
    UPDATE users
    SET
      features = (
        SELECT array_agg(DISTINCT feature)
        FROM unnest(features || ${featuresSqlArray}) AS t(feature)
      )
    WHERE
      username = 'mainUser';
  `);
};

exports.down = false;
