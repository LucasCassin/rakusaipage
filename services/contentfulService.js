import { createClient } from "contentful";

// Inicializa o cliente Contentful com as credenciais do .env.local
const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

/**
 * Mapeia os dados brutos da API do Contentful para um formato mais limpo e simples,
 * contendo apenas as informações que o componente precisa.
 */
const parseCarouselHeroAsset = (asset) => {
  return {
    url: `https:${asset.fields.file.url}`,
    description: asset.fields.description,
    width: asset.fields.file.details.image.width,
    height: asset.fields.file.details.image.height,
  };
};

/**
 * Busca as imagens do carrossel da página inicial.
 * Presume que o ID do seu Content Type (modelo de conteúdo) é 'carroselHome'.
 * Verifique o ID real no seu painel do Contentful em "Content model".
 */
export async function fetchHeroCarouselImages() {
  try {
    const entries = await client.getEntries({
      content_type: "carroselHome", // <<< ATENÇÃO: Use o ID real do seu Content Type aqui!
      select: "fields.imagens", // Seleciona apenas o campo de imagens
      include: 1, // Inclui os dados dos assets (imagens) vinculados na mesma chamada
    });

    if (entries.items.length === 0) {
      console.warn("Nenhuma entrada do tipo 'carroselHome' foi encontrada.");
      return [];
    }

    // Pega a primeira entrada encontrada (você só deve ter uma para o carrossel da home)
    const carouselEntry = entries.items[0];

    // Se o campo de imagens existir, mapeia os dados para o formato limpo.
    if (carouselEntry.fields.imagens) {
      return carouselEntry.fields.imagens.map(parseCarouselHeroAsset);
    }

    return [];
  } catch (error) {
    console.error("Erro ao buscar dados do Contentful:", error);
    return []; // Retorna um array vazio em caso de erro para não quebrar a página
  }
}
