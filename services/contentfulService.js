import { createClient } from "contentful";
import { documentToHtmlString } from "@contentful/rich-text-html-renderer";

// Inicializa o cliente Contentful
const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

// --- HELPER PARSERS ---
// Pequenas funções reutilizáveis para tratar tipos de campos comuns

const parseAsset = (asset) => {
  if (!asset?.fields?.file) return null;
  return {
    url: `https:${asset.fields.file.url}`,
    description: asset.fields.description || "",
    width: asset.fields.file.details.image.width,
    height: asset.fields.file.details.image.height,
  };
};

const parseRichText = (richTextDocument) => {
  if (!richTextDocument) return "";
  return documentToHtmlString(richTextDocument);
};

// --- PARSERS PRINCIPAIS ---
// Cada um sabe como "limpar" os dados de um Content Type específico

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
});

const parseHomeContrate = (fields) => ({
  description: parseRichText(fields.descricao),
  whatsappPhone: fields.telefoneWpp || "",
});

const parseHomeHistoriaTaiko = (fields) => ({
  description: parseRichText(fields.descricao),
});

const parseHomeInstrumentos = (fields) => ({
  description: parseRichText(fields.descricao),
});

const parseRedesSociais = (fields) => ({
  instagram: fields.instagram || "",
  whatsapp: fields.whatsapp || "",
  youtube: fields.youtube || "",
});

const parseHorarioAula = (fields) => ({
  diaDaSemana: fields.diaDaSemana || "",
  ordem: fields.ordem || 0,
  horarios: fields.horarios || [],
});

const parseHomeProximasApre = (fields) => ({
  title: fields.titulo || "",
  description: parseRichText(fields.descricao),
  date: fields.data,
  location: fields.local || null,
});

// --- CONFIGURAÇÃO CENTRAL ---
// Mapeia cada Content Type ID (de entrada única) ao seu respectivo parser.
// Para adicionar uma nova seção no futuro, basta adicioná-la aqui.
const SINGLE_ENTRY_CONFIG = {
  homeCarrossel: { parser: parseHomeCarrossel },
  homeSobre: { parser: parseHomeSobre },
  homeAulas: { parser: parseHomeAulas },
  homeApreEventos: { parser: parseHomeApreEventos },
  homeContrate: { parser: parseHomeContrate },
  homeHistoriaTaiko: { parser: parseHomeHistoriaTaiko },
  homeInstrumentos: { parser: parseHomeInstrumentos },
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
    const entries = await client.getEntries({
      content_type: "homeProximasApre",
      order: "fields.data", // Ordena pela data (mais antiga primeiro)
    });
    return (
      entries.items?.map((item) => parseHomeProximasApre(item.fields)) || []
    );
  } catch (error) {
    console.error("Erro ao buscar apresentações do Contentful:", error);
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
