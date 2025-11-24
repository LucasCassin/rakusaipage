// 1. Definição do Array (como solicitado)
// Adicionamos 'scale' e 'image_url_highlight'
const elementTypes = [
  {
    name: "Oodaiko",
    image_url: "/images/circulo-preto.svg",
    scale: 1.5,
    image_url_highlight: "/images/circulo-rosa.svg",
  },
  {
    name: "Shime",
    image_url: "/images/circulo-preto.svg",
    scale: 0.6,
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
    image_url: "/images/retangulo-preto.svg",
    scale: 1.0,
    image_url_highlight: "/images/retangulo-rosa.svg",
  },
  {
    name: "Chappa",
    image_url: "/images/chappa-preto.svg",
    scale: 0.8,
    image_url_highlight: "/images/chappa-rosa.svg",
  },
  {
    name: "Shinobue",
    image_url: "/images/shinobue-preto.svg",
    scale: 1.0,
    image_url_highlight: "/images/shinobue-rosa.svg",
  },
  {
    name: "Ippon",
    image_url: "/images/retangulo-preenchido-preto.svg",
    scale: 1.0,
    image_url_highlight: "/images/retangulo-preenchido-rosa.svg",
  },
  {
    name: "Pessoa",
    image_url: "/images/pessoa-preto.svg",
    scale: 1.0,
    image_url_highlight: "/images/pessoa-rosa.svg",
  },
  {
    name: "Palco",
    image_url: "/images/stage-line.svg",
    scale: 1.0,
    image_url_highlight: "/images/stage-line.svg",
  },

  {
    name: "Nagado Daiko",
    image_url: "/images/circulo-preto-detalhes-redondos.svg",
    scale: 1.0,
    image_url_highlight: "/images/circulo-rosa-detalhes-redondos.svg",
  },
  {
    name: "Uchiwa Daiko",
    image_url: "/images/uchiwa-preto.svg",
    scale: 0.8,
    image_url_highlight: "/images/uchiwa-rosa.svg",
  },
  {
    name: "Chan-chiki",
    image_url: "/images/chanchiki-preto.svg",
    scale: 0.8,
    image_url_highlight: "/images/chanchiki-rosa.svg",
  },
  {
    name: "Tetsu-zutsu",
    image_url: "/images/tetsu-preto.svg",
    scale: 1.0,
    image_url_highlight: "/images/tetsu-rosa.svg",
  },
  {
    name: "Shakuhachi",
    image_url: "/images/shakuhachi-preto.svg",
    scale: 1.0,
    image_url_highlight: "/images/shakuhachi-rosa.svg",
  },
  {
    name: "Shamisen",
    image_url: "/images/shamisen-preto.svg",
    scale: 1.2,
    image_url_highlight: "/images/shamisen-rosa.svg",
  },
  {
    name: "Hyoshigi",
    image_url: "/images/hyoshigi-preto.svg",
    scale: 0.8,
    image_url_highlight: "/images/hyoshigi-rosa.svg",
  },
  {
    name: "Koto",
    image_url: "/images/koto-preto.svg",
    scale: 1.0,
    image_url_highlight: "/images/koto-rosa.svg",
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
