// O "id" da feature que acabamos de adicionar
const READ_PRESENTATION_SELF = "read:presentation:self";

exports.up = (pgm) => {
  // A mágica está aqui:
  // 1. Encontra todos os usuários (jsonb_array_elements_text)
  // 2. Filtra aqueles que JÁ TÊM a feature (WHERE feature = 'read:presentation:self')
  // 3. Remove-os da lista (WHERE u.id NOT IN (...))
  // 4. Para os usuários restantes, adiciona a feature ao array 'features'
  pgm.sql(`
    UPDATE users
    SET features = features || '["${READ_PRESENTATION_SELF}"]'::jsonb
    WHERE id NOT IN (
      SELECT DISTINCT u.id
      FROM users u, jsonb_array_elements_text(u.features) AS feature
      WHERE feature = '${READ_PRESENTATION_SELF}'
    );
  `);
};

// Não há como reverter isso de forma limpa sem saber
// quem tinha e quem não tinha, então não fazemos um 'down'.
exports.down = false;
