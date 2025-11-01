const featuresToAdd = ["delete:payment:other"];

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
