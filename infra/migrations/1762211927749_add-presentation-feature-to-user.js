const READ_PRESENTATION_SELF = "read:presentation:self";

exports.up = (pgm) => {
  // --- SQL CORRIGIDO ---
  // Esta query usa funções de array de texto (text[])
  pgm.sql(`
    UPDATE users
    SET features = array_append(features, '${READ_PRESENTATION_SELF}')
    WHERE NOT ('${READ_PRESENTATION_SELF}' = ANY(features));
  `);
  // --- FIM DA CORREÇÃO ---
};

exports.down = false;
