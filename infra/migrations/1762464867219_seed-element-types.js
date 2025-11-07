//
const ICONS_PATH = "/images"; // Caminho base na pasta 'public'

const elementTypes = [
  { name: "Ōdaiko", image_url: `${ICONS_PATH}/Odaiko.svg` },
  { name: "Shime-daiko", image_url: `${ICONS_PATH}/Shime.svg` },
  { name: "Okedo", image_url: `${ICONS_PATH}/Okedo.svg` },
  { name: "Pessoa", image_url: `${ICONS_PATH}/Person.svg` },
  { name: "Katsugi", image_url: `${ICONS_PATH}/Katsugi.svg` },
  { name: "Ippon", image_url: `${ICONS_PATH}/Ippon.svg` },
  { name: "Shinobue", image_url: `${ICONS_PATH}/Shinobue.svg` },
  { name: "Chappa", image_url: `${ICONS_PATH}/Chappa.svg` },
  { name: "Palco", image_url: `${ICONS_PATH}/stage-line.svg` },
];

exports.up = async (pgm) => {
  // Usamos 'pgm.db.query' para um controle mais fácil do 'INSERT'
  for (const type of elementTypes) {
    await pgm.db.query(
      `INSERT INTO element_types (name, image_url) VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING;`, // Evita duplicatas se a migration rodar 2x
      [type.name, type.image_url],
    );
  }
};

// Não há 'down' para um 'seed', pois não queremos deletar os ícones.
exports.down = false;
