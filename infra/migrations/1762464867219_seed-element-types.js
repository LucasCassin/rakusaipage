// 1. Definição do Array (como solicitado)
// Adicionamos 'scale' e 'image_url_highlight'
const elementTypes = [
  {
    name: "Odaiko",
    image_url: "/images/circulo-preto.svg",
    scale: 1.5,
    image_url_highlight: "/images/circulo-rosa.svg",
  },
  {
    name: "Shime",
    image_url: "/images/circulo-preto.svg",
    scale: 0.7,
    image_url_highlight: "/images/circulo-rosa.svg",
  },
  {
    name: "Okedo",
    image_url: "/images/circulo-preto.svg",
    scale: 1.0,
    image_url_highlight: "/images/circulo-rosa.svg",
  },
  {
    name: "Katsugi",
    image_url: "/images/Katsugi.svg",
    scale: 1.0,
    image_url_highlight: "/images/Katsugi.svg",
  },
  {
    name: "Chappa",
    image_url: "/images/Chappa.svg",
    scale: 0.6,
    image_url_highlight: "/images/Chappa.svg",
  },
  {
    name: "Shinobue",
    image_url: "/images/Shinobue.svg",
    scale: 1.0,
    image_url_highlight: "/images/Shinobue.svg",
  },
  {
    name: "Ippon",
    image_url: "/images/Ippon.svg",
    scale: 1.0,
    image_url_highlight: "/images/Ippon.svg",
  },
  {
    name: "Person",
    image_url: "/images/Person.svg",
    scale: 1.0,
    image_url_highlight: "/images/Person.svg",
  },
  {
    name: "Palco",
    image_url: "/images/stage-line.svg",
    scale: 1.0,
    image_url_highlight: "/images/stage-line.svg",
  },
];

exports.up = (pgm) => {
  // 2. Mapear o array para a string de VALUES
  const values = elementTypes
    .map((type) => {
      // Trata o 'null' para 'image_url_highlight'
      const highlight = type.image_url_highlight
        ? `'${type.image_url_highlight}'`
        : "null";

      return `('${type.name}', '${type.image_url}', ${type.scale}, ${highlight})`;
    })
    .join(",\n");

  // 3. Executar o SQL
  pgm.sql(`
    INSERT INTO element_types 
      (name, image_url, scale, image_url_highlight) 
    VALUES
      ${values}
    ON CONFLICT (name) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM element_types;
  `);
};
