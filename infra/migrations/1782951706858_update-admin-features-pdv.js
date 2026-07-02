const featuresToAdd = [
  "pdv:sell",
  "pdv:products:manage",
  "pdv:payment_methods:manage",
  "pdv:config:manage",
  "pdv:sales:cancel",
  "pdv:reports:read",
];

exports.up = (pgm) => {
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
