import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import { processYouTubeLink } from "src/utils/videoAulaUtils.js";

import VideoPlayer from "components/student/VideoPlayer";
import CommentsSection from "components/comments/CommentsSection";
import { useComments } from "src/hooks/useComments.js";
import UserAvatar from "components/ui/UserAvatar";
import { FiX, FiMessageSquare } from "react-icons/fi";

import Loading from "components/Loading";
import Alert from "components/ui/Alert";
import { useMessage } from "src/hooks/useMessage.js";

const CommentPreview = ({ comment, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      {comment ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-sm">Comentários</p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <FiMessageSquare />
              <span>Ver todos</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserAvatar username={comment.username} />
            <div>
              <p className="text-xs font-bold">{comment.username}</p>
              <p className="text-sm text-gray-700 line-clamp-2">
                {comment.content}
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-500 text-center">
          Seja o(a) primeiro(a) a comentar!
        </div>
      )}
    </button>
  );
};

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

  const [activeVideo, setActiveVideo] = useState(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const { comments: videoComments } = useComments({
    videoId: activeVideo?.videoId,
    user: user,
    isLoadingAuth: isLoadingAuth,
  });

  const topComment = useMemo(() => {
    return videoComments?.length > 0 ? videoComments[0] : null;
  }, [videoComments]);

  useEffect(() => {
    if (isLoadingAuth || !collection) return;
    if (!user) {
      setError(texts.videoAulas.message.error.notAuthenticated);
      setShowContent(false);
      setTimeout(() => router.push(settings.global.REDIRECTS.LOGIN), 3000);
      return;
    }
    const canAccess = collection.niveis.some((requiredFeature) =>
      user.features?.includes(requiredFeature),
    );
    if (!canAccess) {
      setError(texts.videoAulas.message.error.noPermission);
      setShowContent(false);
      router.push(backLink);
      return;
    }
    setShowContent(true);
  }, [user, isLoadingAuth, router, setError, collection]);

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
      const processedVideos = videosArrays.flat().filter(Boolean);

      setProcessedCollection({
        ...collection,
        videos: processedVideos,
      });
      if (processedVideos.length > 0 && !activeVideo) {
        setActiveVideo(processedVideos[0]);
      }
      setIsLoadingVideos(false);
    };
    processCollection();
  }, [collection, youtubeApiKey, showContent, activeVideo]);

  useEffect(() => {
    if (isCommentsOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isCommentsOpen]);

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
        <h1 className="text-4xl font-bold text-gray-900">{collection.title}</h1>
        {collection.description && (
          <div className="mb-8">
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
            <VideoPlayer
              collection={processedCollection}
              activeVideo={activeVideo}
              onVideoSelect={setActiveVideo}
              mobileCommentPreview={
                <CommentPreview
                  comment={topComment}
                  onClick={() => setIsCommentsOpen(true)}
                />
              }
            />
          )
        )}

        {activeVideo && (
          <div className="mt-8">
            <div className="hidden lg:block">
              <CommentsSection videoId={activeVideo.videoId} />
            </div>
          </div>
        )}
      </main>

      {isCommentsOpen && activeVideo && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col lg:hidden">
          {/* Botão de fechar flutuante */}
          <button
            onClick={() => setIsCommentsOpen(false)}
            className="fixed top-[10.5px] right-4 z-[60] p-2 bg-gray-800/50 text-white rounded-full"
            aria-label="Fechar comentários"
          >
            <FiX size={20} />
          </button>

          {/* Container que força CommentsSection a ocupar toda a altura */}
          <div className="w-full h-full flex flex-col">
            <CommentsSection
              videoId={activeVideo.videoId}
              isFullScreen={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
