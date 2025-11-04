// É uma boa prática agrupar as features que você quer adicionar
const FEATURES_TO_ADD = [
  "read:presentation:self",
  "update:presentation:self",
  "delete:presentation:self",
];

exports.up = (pgm) => {
  // Converte o array de features e JÁ FAZ O CAST para o tipo correto
  // O erro indica que a coluna 'features' é 'character varying[]'
  const featuresArraySql = `ARRAY[${FEATURES_TO_ADD.map((f) => `'${f}'`).join(
    ", ",
  )}]::character varying[]`; // <-- A CORREÇÃO ESTÁ AQUI
  // Sua lógica SQL estava correta, só precisava do cast

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
