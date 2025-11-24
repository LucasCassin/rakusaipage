// Lista de features a serem adicionadas
const featuresToAdd = [
  "read:presentation:admin",
  "create:presentation",
  "update:presentation",
  "delete:presentation",
  "create:viewer",
  "read:viewer",
  "delete:viewer",
  "create:scene",
  "update:scene",
  "delete:scene",
  "create:element",
  "update:element",
  "delete:element",
  "read:element",
  "create:step",
  "update:step",
  "delete:step",
  "manage:element_types",
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
