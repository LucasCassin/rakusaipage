import { createClient } from "contentful";
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";

// Inicializa o cliente Contentful
const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

// --- HELPER PARSERS ---
const parseAsset = (asset) => {
  if (!asset?.fields?.file) return null;
  return {
    url: `https:${asset.fields.file.url}`,
    description: asset.fields.description || asset.fields.title || "",
    width: asset.fields.file.details.image.width,
    height: asset.fields.file.details.image.height,
  };
};

const parseRichText = (richTextDocument) => {
  if (!richTextDocument) return "";
  return documentToHtmlString(richTextDocument);
};

// --- PARSERS PRINCIPAIS ---

const parseHomeCarrossel = (fields) => ({
  title: fields.titulo || "Rakusai Taiko",
  description: fields.descricao || "",
  images: fields.images?.map(parseAsset).filter(Boolean) || [],
});

const parseHomeSobre = (fields) => ({
  description: parseRichText(fields.descricao),
});

const parseHomeAulas = (fields) => ({
  description: parseRichText(fields.descricao),
  featuredImage: fields.imagemDeDestaque
    ? parseAsset(fields.imagemDeDestaque)
    : null,
});

const parseHomeApreEventos = (fields) => ({
  description: parseRichText(fields.descricao),
  videoUrls: fields.videosUrl || [],
  images:
    fields.imagens
      ?.sort(() => Math.random() - 0.5) // Randomize the array
      .slice(0, 4) // Get the first 4 elements
      .map(parseAsset)
      .filter(Boolean) || [],
});

const parseHomeContrate = (fields) => ({
  description: parseRichText(fields.descricao),
  whatsappPhone: fields.telefoneWpp || "",
});

const parseHomeHistoriaTaiko = (fields) => ({
  description: parseRichText(fields.descricao),
});

const parseHomeInstrumentos = (fields) => ({
  order: fields.ordem,
  title: fields.titulo || "",
  description: parseRichText(fields.descricao),
  image: fields.imagem ? parseAsset(fields.imagem) : null,
});

// MUDANÇA AQUI: Parser de Redes Sociais simplificado
const parseRedesSociais = (fields) => ({
  instagram: fields.instagram || null,
  youtube: fields.youtube || null,
  whatsapp: fields.whatsapp || null,
  email: fields.email || null,
  localName: fields.localName || "Local de Ensaio",
  googleMapsLink: fields.googleMapsLink || null, // Link para o clique
  mapEmbedUrl: fields.streetViewEmbedUrl || fields.googleMapsLinkLong || null, // Link para o iframe
});

// MUDANÇA AQUI: Parser de Próximas Apresentações simplificado
const parseHomeProximasApre = (fields) => ({
  title: fields.titulo || "",
  description: parseRichText(fields.descricao),
  date: fields.data,
  locationName: fields.localTexto || "Local a definir",
  googleMapsLink: fields.googleMapsLink || null, // Apenas este link é necessário
  showCountdownDays: fields.mostrarTravaTelaNDiasAntes ?? -1,
});

const parseTipoEvento = (fields) => ({
  order: fields.ordem || 0,
  title: fields.titulo || "",
  description: fields.descricao || "",
  iconName: fields.iconName || "Sparkles",
});

// --- CONFIGURAÇÃO CENTRAL ---
const SINGLE_ENTRY_CONFIG = {
  homeCarrossel: { parser: parseHomeCarrossel },
  homeSobre: { parser: parseHomeSobre },
  homeAulas: { parser: parseHomeAulas },
  homeApreEventos: { parser: parseHomeApreEventos },
  homeContrate: { parser: parseHomeContrate },
  homeHistoriaTaiko: { parser: parseHomeHistoriaTaiko },
  redesSociais: { parser: parseRedesSociais },
};

// --- FUNÇÕES DE BUSCA EXPORTADAS ---

/**
 * Busca os dados de todas as seções da landing page que possuem apenas uma entrada.
 * Faz uma única chamada de API para otimização.
 */
export async function fetchLandingPageData() {
  const pageData = {};
  try {
    const contentTypeIds = Object.keys(SINGLE_ENTRY_CONFIG);
    const entries = await client.getEntries({
      "sys.contentType.sys.id[in]": contentTypeIds.join(","),
      include: 2, // Inclui dados de assets vinculados (ex: imagens)
    });

    if (entries.items) {
      for (const item of entries.items) {
        const typeId = item.sys.contentType.sys.id;
        const config = SINGLE_ENTRY_CONFIG[typeId];
        if (config) {
          pageData[typeId] = config.parser(item.fields);
        }
      }
    }
  } catch (error) {
    console.error("Erro ao buscar dados da landing page do Contentful:", error);
  }
  return pageData;
}

/**
 * Busca todas as próximas apresentações e as ordena pela data mais recente.
 */
export async function fetchUpcomingPresentations() {
  try {
    const today = new Date();
    // Zera o horário para comparar apenas a data
    today.setHours(0, 0, 0, 0);

    const entries = await client.getEntries({
      content_type: "homeProximasApre",
      order: "fields.data",
    });

    if (!entries.items) return [];

    // MUDANÇA: Filtra a lista para incluir apenas eventos de hoje em diante
    const upcomingEvents = entries.items.filter((item) => {
      const eventDate = new Date(item.fields.data);
      return eventDate >= today;
    });

    return upcomingEvents.map((item) => parseHomeProximasApre(item.fields));
  } catch (error) {
    console.error("Erro ao buscar apresentações do Contentful:", error);
    return [];
  }
}

/**
 * Busca todos os instrumentos e os ordena pelo campo 'ordem'.
 */
export async function fetchInstrumentos() {
  try {
    const entries = await client.getEntries({
      content_type: "homeInstrumentos",
      order: "fields.ordem",
      include: 2,
    });
    return (
      entries.items?.map((item) => parseHomeInstrumentos(item.fields)) || []
    );
  } catch (error) {
    console.error("Erro ao buscar instrumentos do Contentful:", error);
    return [];
  }
}

/**
 * Busca todos os horários de aula e os ordena pelo campo 'ordem'.
 */
export async function fetchHorariosAula() {
  try {
    const entries = await client.getEntries({
      content_type: "horarioAula",
      order: "fields.ordem", // Ordena pela ordem (Seg, Sex, Sab)
    });
    // Aqui retornamos o objeto completo, pois o componente precisa do 'sys.id' para a key
    return entries.items || [];
  } catch (error) {
    console.error("Erro ao buscar horários de aula do Contentful:", error);
    return [];
  }
}

/**
 * Busca todos os tipos de evento e os ordena pelo campo 'ordem'.
 */
export async function fetchTiposEvento() {
  try {
    const entries = await client.getEntries({
      content_type: "tipoEvento",
      order: "fields.ordem",
    });
    return entries.items?.map((item) => parseTipoEvento(item.fields)) || [];
  } catch (error) {
    console.error("Erro ao buscar tipos de evento do Contentful:", error);
    return [];
  }
}
