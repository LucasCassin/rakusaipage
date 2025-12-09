const FEATURES_TO_ADD = ["shop:consumer:view"];

exports.up = (pgm) => {
  const featuresArraySql = `ARRAY[${FEATURES_TO_ADD.map((f) => `'${f}'`).join(
    ", ",
  )}]::character varying[]`;

  pgm.sql(`
  UPDATE users
  SET features = (
   SELECT array_agg(DISTINCT feature_name)
   FROM unnest(features || ${featuresArraySql}) AS t(feature_name)
  )
  WHERE NOT (features @> ${featuresArraySql});
 `);
};

exports.down = false;
