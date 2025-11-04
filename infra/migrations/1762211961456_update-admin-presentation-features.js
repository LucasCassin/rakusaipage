// Lista de features a serem adicionadas
const featuresToAdd = [
  "create:presentation",
  "read:presentation:self",
  "read:presentation:other",
  "update:presentation:self",
  "update:presentation:other",
  "delete:presentation:self",
  "delete:presentation:other",
  "manage:presentation_viewers",
  "create:scene",
  "update:scene",
  "delete:scene",
  "create:scene_element",
  "update:scene_element",
  "delete:scene_element",
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
