import React, { useMemo, useRef, useEffect } from "react";
import VideoCard from "./VideoCard";
import { useViewportSize } from "src/hooks/useViewportSize";

// MUDANÇA: Recebe a nova prop 'mobileCommentPreview'
export default function VideoPlayer({
  collection,
  activeVideo,
  onVideoSelect,
  mobileCommentPreview,
}) {
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const playerColumnRef = useRef(null);
  const isMobile = viewportWidth < 1024;

  useEffect(() => {
    if (!activeVideo && collection.videos && collection.videos.length > 0) {
      onVideoSelect(collection.videos[0]);
    }
  }, [collection.videos, activeVideo, onVideoSelect]);

  const { playerHeight, listMaxHeight, playerWith } = useMemo(() => {
    if (isMobile) {
      if (viewportWidth === 0)
        return { playerHeight: 0, listMaxHeight: 384, playerWith: 0 };
      const availableWidth = viewportWidth - 48;
      const availableHeight = viewportHeight;
      const calculatedWidth = availableHeight * (16 / 9);
      const finalWidth =
        calculatedWidth > availableWidth ? availableWidth : calculatedWidth;
      const finalHeight = finalWidth * (9 / 16);
      return {
        playerHeight: finalHeight,
        listMaxHeight: 384,
        playerWith: finalWidth,
      };
    }
    if (playerColumnRef.current) {
      const columnWidth = playerColumnRef.current.offsetWidth;
      const calculatedHeight = columnWidth * (9 / 16);
      return {
        playerHeight: calculatedHeight,
        listMaxHeight: calculatedHeight,
        playerWith: columnWidth,
      };
    }
    return { playerHeight: 450, listMaxHeight: 450 };
  }, [viewportWidth, viewportHeight, playerColumnRef.current, isMobile]);

  if (!activeVideo) {
    return (
      <div className="text-center text-gray-500 lg:col-span-3">
        Carregando vídeo...
      </div>
    );
  }

  return (
    <div
      className="grid lg:grid-cols-3 gap-8 mx-auto"
      style={isMobile ? { width: `${playerWith}px` } : {}}
    >
      {/* Coluna do Player de Vídeo */}
      <div
        ref={playerColumnRef}
        className="lg:col-span-2 w-full flex items-center justify-center"
        style={{ height: `${playerHeight}px`, width: `${playerWith}px` }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={activeVideo.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full rounded-xl shadow-2xl"
        ></iframe>
      </div>

      {/* MUDANÇA: Preview do comentário para mobile, posicionado aqui */}
      <div className="block lg:hidden">{mobileCommentPreview}</div>

      {/* Coluna da Lista de Vídeos */}
      <div
        className="w-full overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
        style={{ maxHeight: `${listMaxHeight}px` }}
      >
        {collection.videos.map((video) => (
          <VideoCard
            key={video.videoId}
            video={video}
            onClick={() => onVideoSelect(video)}
            isActive={activeVideo.videoId === video.videoId}
          />
        ))}
      </div>
    </div>
  );
}
