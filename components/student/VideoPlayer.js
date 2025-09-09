import React, { useState, useEffect, useMemo, useRef } from "react";
import VideoCard from "./VideoCard";
import { useViewportSize } from "src/hooks/useViewportSize";

export default function VideoPlayer({ collection }) {
  const [activeVideo, setActiveVideo] = useState(null);
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const playerColumnRef = useRef(null); // Ref para medir a largura da coluna do player
  const isMobile = viewportWidth < 1024; // Breakpoint 'lg'

  useEffect(() => {
    if (collection.videos && collection.videos.length > 0) {
      setActiveVideo(collection.videos[0]);
    }
  }, [collection.videos]);

  // Lógica para calcular a altura do player e da lista de forma dinâmica
  const { playerHeight, listMaxHeight, playerWith } = useMemo(() => {
    // Lógica para mobile
    if (isMobile) {
      if (viewportWidth === 0)
        return { playerHeight: 0, listMaxHeight: 384, playerWith: 0 }; // Evita cálculo com 0
      const availableWidth = viewportWidth - 48; // Considera os paddings (px-4)
      // const calculatedHeight = availableWidth * (9 / 16);
      const availableHeight = viewportHeight;
      const calculatedWidth = availableHeight * (16 / 9);
      const finalWidth =
        calculatedWidth > availableWidth ? availableWidth : calculatedWidth;
      const finalHeight = finalWidth * (9 / 16);

      return {
        playerHeight: finalHeight,
        listMaxHeight: 384,
        playerWith: finalWidth,
      }; // 384px = max-h-96
    }

    // Lógica para Desktop
    if (playerColumnRef.current) {
      const columnWidth = playerColumnRef.current.offsetWidth;
      const calculatedHeight = columnWidth * (9 / 16);
      // No desktop, a lista tem a mesma altura do player
      return {
        playerHeight: calculatedHeight,
        listMaxHeight: calculatedHeight,
        playerWith: columnWidth,
      };
    }

    // Fallback para o carregamento inicial no desktop
    return { playerHeight: 450, listMaxHeight: 450 };
  }, [viewportWidth, viewportHeight, playerColumnRef.current]);

  if (!activeVideo) {
    return (
      <p className="text-center text-gray-500">
        Nenhum vídeo disponível nesta coleção.
      </p>
    );
  }

  return (
    <div
      className="grid lg:grid-cols-3 gap-8 mx-auto"
      style={isMobile ? { width: `${playerWith}px` } : {}}
    >
      {/* Coluna do Player */}
      <div
        ref={playerColumnRef}
        className="lg:col-span-2 w-full flex items-center justify-center"
        // A altura agora é calculada dinamicamente para todos os cenários
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

      {/* Coluna da Lista de Vídeos */}
      <div
        className="w-full overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
        // A altura máxima da lista agora é sincronizada com a altura do player
        style={{ maxHeight: `${listMaxHeight}px` }}
      >
        {collection.videos.map((video) => (
          <VideoCard
            key={video.videoId}
            video={video}
            onClick={() => setActiveVideo(video)}
            isActive={activeVideo.videoId === video.videoId}
          />
        ))}
      </div>
    </div>
  );
}
