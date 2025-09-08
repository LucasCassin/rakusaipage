import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import { processYouTubeLink } from "src/utils/videoAulaUtils.js";

import VideoPlayer from "components/student/VideoPlayer";
import Loading from "components/Loading";
import Alert from "components/ui/Alert";
import { useMessage } from "src/hooks/useMessage.js";

export default function CollectionDetailPage({
  collection,
  youtubeApiKey,
  pageConfig,
}) {
  const { backLink, backText } = pageConfig;

  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { error, setError } = useMessage();

  const [showContent, setShowContent] = useState(false);
  const [processedCollection, setProcessedCollection] = useState(null);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Efeito para autenticação e permissões
  useEffect(() => {
    if (isLoadingAuth || !collection) return;
    if (!user) {
      setError(texts.videoAulas.message.error.notAuthenticated);
      setShowContent(false);
      setTimeout(() => router.push(settings.global.REDIRECTS.LOGIN), 3000);
      return;
    }
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
      <div className="flex items-center justify-center min-h-screen p-4">
        {error ? (
          <Alert type="error">{error}</Alert>
        ) : (
          <Loading message="Verificando permissões..." />
        )}
      </div>
    );
  }

  if (!collection) {
    return <div className="text-center py-20">Coleção não encontrada.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      <main className="container mx-auto max-w-7xl py-10 px-4 sm:px-6 lg:px-8">
        <Link
          href={backLink}
          className="text-rakusai-purple hover:underline mb-6 inline-block"
        >
          &larr; {backText}
        </Link>
        <h1 className={`text-4xl font-bold text-gray-900 `}>
          {collection.title}
        </h1>
        {collection.description && (
          <div className={`mb-8`}>
            <div
              className={`prose prose-p:text-justify max-w-none overflow-hidden transition-all duration-500 ${
                isDescriptionExpanded ? "max-h-[1000px]" : "max-h-0"
              }`}
              dangerouslySetInnerHTML={{ __html: collection.description }}
            />
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="text-gray-400 font-medium hover:underline mt-1"
            >
              {isDescriptionExpanded ? "Ver menos" : "Ver Descrição"}
            </button>
          </div>
        )}
        {isLoadingVideos ? (
          <Loading message="Carregando vídeos da coleção..." />
        ) : (
          processedCollection && (
            <VideoPlayer collection={processedCollection} />
          )
        )}
      </main>
    </div>
  );
}
