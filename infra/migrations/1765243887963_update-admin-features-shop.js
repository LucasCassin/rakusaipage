const featuresToAdd = [
  "shop:consumer:view",
  "shop:products:manage",
  "shop:products:read_all",
  "shop:orders:manage",
  "shop:orders:read_all",
  "shop:coupons:manage",
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
