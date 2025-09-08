import {
  fetchVideoAulaCollections,
  fetchVideoAulaCollectionBySlug,
} from "services/contentfulService.js";

// Função para buscar os detalhes de um link do YouTube (playlist ou vídeo)
export async function processYouTubeLink(link, apiKey) {
  try {
    const url = new URL(link);
    const playlistId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    if (playlistId) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=id,snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`,
      );
      const data = await response.json();
      if (data.error)
        throw new Error(`YouTube API Error: ${data.error.message}`);
      return (
        data.items?.map((item) => ({
          title: item.snippet.title,
          thumbnail:
            item.snippet.thumbnails.high?.url ||
            item.snippet.thumbnails.default?.url,
          videoId: item.snippet.resourceId.videoId,
        })) || []
      );
    } else if (videoId) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
      );
      const data = await response.json();
      if (data.error)
        throw new Error(`YouTube API Error: ${data.error.message}`);
      const video = data.items[0];
      return video
        ? [
            {
              title: video.snippet.title,
              thumbnail:
                video.snippet.thumbnails.high?.url ||
                video.snippet.thumbnails.default?.url,
              videoId: video.id,
            },
          ]
        : [];
    }
    return [];
  } catch (error) {
    console.error(`Erro ao processar link do YouTube (${link}):`, error);
    return [];
  }
}

// Função reutilizável para o getServerSideProps das páginas de catálogo
export async function getVideoAulaCatalogProps() {
  const youtubeApiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  let collections = await fetchVideoAulaCollections();

  if (youtubeApiKey && collections) {
    collections = await Promise.all(
      collections.map(async (collection) => {
        const videoArrays = await Promise.all(
          collection.youtubeLinks.map((link) =>
            processYouTubeLink(link, youtubeApiKey),
          ),
        );
        const videos = videoArrays.flat().filter(Boolean);
        return { ...collection, videos };
      }),
    );
  }

  return {
    props: {
      collections: collections || [],
    },
  };
}

export async function getVideoAulaDetailPageProps(context) {
  const { slug } = context.params;
  const collection = await fetchVideoAulaCollectionBySlug(slug);

  if (!collection) {
    return { notFound: true };
  }

  return {
    props: {
      collection,
      youtubeApiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || null,
    },
  };
}
