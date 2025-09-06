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
  backgroundImage: fields.image ? parseAsset(fields.image) : null,
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
      ?.sort(() => Math.random() - 0.5)
      .slice(0, 4)
      .map(parseAsset)
      .filter(Boolean) || [],
});

const parseHomeContrate = (fields) => ({
  description: parseRichText(fields.descricao),
  whatsappPhone: fields.telefoneWpp || "",
  contactName: fields.nomeContato || null,
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

const parseRedesSociais = (fields) => ({
  instagram: fields.instagram || null,
  youtube: fields.youtube || null,
  whatsapp: fields.whatsapp || null,
  email: fields.email || null,
  localName: fields.localName || "Endereço a definir",
  googleMapsLink: fields.googleMapsLink || null,
  mapEmbedUrl: fields.streetViewEmbedUrl || fields.googleMapsLinkLong || null,
  contactName: fields.nomeContatoWpp || null,
});

const parseHomeProximasApre = (fields) => ({
  title: fields.titulo || "",
  description: parseRichText(fields.descricao),
  date: fields.data,
  locationName: fields.localTexto || "Local a definir",
  googleMapsLink: fields.googleMapsLink || null,
  showCountdownDays: fields.mostrarTravaTelaNDiasAntes ?? -1,
});

const parseTipoEvento = (fields) => ({
  order: fields.ordem || 0,
  title: fields.titulo || "",
  description: fields.descricao || "",
  iconName: fields.iconName || "Sparkles",
});

const parseAlunoBoasVindas = (fields) => ({
  title: fields.titulo || "Bem-vindo(a) de volta,",
  subtitle: fields.subtitulo || "Vamos fazer barulho!",
  backgroundImage: fields.imagemDeFundo
    ? parseAsset(fields.imagemDeFundo)
    : null,
});

const parseComunicado = (fields) => ({
  title: fields.titulo || "",
  description: parseRichText(fields.descricao),
  subject: fields.assunto || "Geral",
  features: fields.features || [],
  startDate: fields.dataDeInicio,
  endDate: fields.dataDeFim,
  canDismissSplash: fields.travaTelaPodeFechar ?? true,
  showSplash: fields.podeMostrarTravaTela ?? false,
});

const parseVideoAulaCollection = (fields) => ({
  title: fields.titulo || null,
  description: parseRichText(fields.descricao),
  youtubeLinks: fields.youTubeLinks || [],
  niveis: fields.niveis || [],
  thumbnail: fields.image ? parseAsset(fields.image) : null,
  slug: fields.slug || null,
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
  alunoBoasVindas: { parser: parseAlunoBoasVindas },
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

/**
 * Busca todos os comunicados e os ordena pela data de início mais recente.
 */
export async function fetchComunicados() {
  try {
    const entries = await client.getEntries({
      content_type: "aulaComunicado",
      order: "-fields.dataDeInicio", // O '-' ordena do mais novo para o mais antigo
    });
    return entries.items?.map((item) => parseComunicado(item.fields)) || [];
  } catch (error) {
    console.error("Erro ao buscar comunicados do Contentful:", error);
    return [];
  }
}

/**
 * Busca todas as coleções de vídeo aulas.
 */
export async function fetchVideoAulaCollections() {
  try {
    const entries = await client.getEntries({
      content_type: "videoAulaCollection",
    });
    return (
      entries.items?.map((item) => parseVideoAulaCollection(item.fields)) || []
    );
  } catch (error) {
    console.error(
      "Erro ao buscar coleções de vídeo aulas do Contentful:",
      error,
    );
    return [];
  }
}

export async function fetchVideoAulaCollectionBySlug(slug) {
  try {
    const entries = await client.getEntries({
      content_type: "videoAulaCollection",
      "fields.slug": slug,
      limit: 1,
    });
    if (entries.items && entries.items.length > 0) {
      return parseVideoAulaCollection(entries.items[0].fields);
    }
    return null;
  } catch (error) {
    console.error(`Erro ao buscar coleção com slug ${slug}:`, error);
    return null;
  }
}
