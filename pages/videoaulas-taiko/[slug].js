import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import { fetchVideoAulaCollectionBySlug } from "services/contentfulService.js";

import RootLayout from "pages/layout";
import VideoPlayer from "components/student/VideoPlayer";
import Loading from "components/Loading";
import Alert from "components/ui/Alert";
import { useMessage } from "src/hooks/useMessage.js";

// --- Função Auxiliar para a API do YouTube ---
async function processYouTubeLink(link, apiKey) {
  try {
    const url = new URL(link);
    const playlistId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    if (playlistId) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`,
      );
      const data = await response.json();
      if (data.error)
        throw new Error(`YouTube API Error: ${data.error.message}`);
      return data.items.map((item) => ({
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.default?.url,
        videoId: item.snippet.resourceId.videoId,
      }));
    } else if (videoId) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
      );
      const data = await response.json();
      if (data.error)
        throw new Error(`YouTube API Error: ${data.error.message}`);
      const video = data.items[0];
      return [
        {
          title: video.snippet.title,
          thumbnail:
            video.snippet.thumbnails.high?.url ||
            video.snippet.thumbnails.default?.url,
          videoId: video.id,
        },
      ];
    }
    return [];
  } catch (error) {
    console.error(`Erro ao processar link do YouTube (${link}):`, error);
    return [];
  }
}

// --- Componente da Página ---
export default function CollectionDetailPage({ collection, youtubeApiKey }) {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { error, setError } = useMessage();

  const [showContent, setShowContent] = useState(false);
  const [processedCollection, setProcessedCollection] = useState(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);

  // Efeito para autenticação e permissões
  useEffect(() => {
    if (isLoadingAuth || !collection) return;

    if (!user) {
      setError(texts.videoAulas.message.error.notAuthenticated);
      setShowContent(false);
      setTimeout(() => router.push(settings.global.REDIRECTS.LOGIN), 3000);
      return;
    }

    // const nivelOrder = {
    //   iniciante: 0,
    //   intermediario: 1,
    //   avancado: 2,
    //   admin: 3,
    // };
    // let userMaxNiveis = { taiko: -1, fue: -1 };
    // settings.nivel.taiko.forEach((n) => {
    //   if (user.features.includes(n.feature) && n.ord > userMaxNiveis.taiko)
    //     userMaxNiveis.taiko = n.ord;
    // });
    // settings.nivel.fue.forEach((n) => {
    //   if (user.features.includes(n.feature) && n.ord > userMaxNiveis.fue)
    //     userMaxNiveis.fue = n.ord;
    // });

    // const canAccess = collection.niveis.some((nivelFeature) => {
    //   const [_, mod, niv] = nivelFeature.split(":");
    //   return userMaxNiveis[mod] >= nivelOrder[niv];
    // });

    const canAccess = collection.niveis.some((requiredFeature) =>
      user.features.includes(requiredFeature),
    );

    if (!canAccess) {
      setError(texts.videoAulas.message.error.noPermission);
      setShowContent(false);
      router.push(settings.global.REDIRECTS.FORBIDDEN);
      return;
    }

    setShowContent(true);
  }, [user, isLoadingAuth, router, setError, collection]);

  // Efeito para processar os vídeos
  useEffect(() => {
    const processCollection = async () => {
      if (!collection || !showContent || !youtubeApiKey) {
        setIsLoadingVideos(false);
        return;
      }
      setIsLoadingVideos(true);
      const videoPromises = collection.youtubeLinks.map((link) =>
        processYouTubeLink(link, youtubeApiKey),
      );
      const videosArrays = await Promise.all(videoPromises);
      setProcessedCollection({
        ...collection,
        videos: videosArrays.flat().filter(Boolean),
      });
      setIsLoadingVideos(false);
    };
    processCollection();
  }, [collection, youtubeApiKey, showContent]);

  if (isLoadingAuth || !showContent) {
    return (
      <RootLayout>
        <div className="flex items-center justify-center min-h-screen p-4">
          {error ? (
            <Alert type="error">{error}</Alert>
          ) : (
            <Loading message="A verificar permissões..." />
          )}
        </div>
      </RootLayout>
    );
  }

  if (!collection) {
    return (
      <RootLayout>
        <div className="text-center py-20">Coleção não encontrada.</div>
      </RootLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      <main className="container mx-auto max-w-7xl py-10 px-4 sm:px-6 lg:px-8">
        <Link
          href="/videoaulas-taiko"
          className="text-rakusai-purple hover:underline mb-6 inline-block"
        >
          &larr; Voltar para todas as coleções
        </Link>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {collection.title}
        </h1>
        {collection.description && (
          <div
            className="prose mb-8"
            dangerouslySetInnerHTML={{ __html: collection.description }}
          />
        )}

        {isLoadingVideos ? (
          <Loading message="A carregar vídeos da coleção..." />
        ) : (
          processedCollection && (
            <VideoPlayer collection={processedCollection} />
          )
        )}
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { slug } = context.params;
  const collection = await fetchVideoAulaCollectionBySlug(slug);

  if (!collection) {
    return { notFound: true }; // Retorna uma página 404 se a coleção não for encontrada
  }

  return {
    props: {
      collection,
      youtubeApiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || null,
    },
  };
}
