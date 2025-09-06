import React, { useState, useEffect } from "react";
import VideoCard from "./VideoCard";

export default function VideoPlayer({ collection }) {
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    if (collection.videos && collection.videos.length > 0) {
      setActiveVideo(collection.videos[0]);
    }
  }, [collection.videos]);

  if (!activeVideo) {
    return (
      <p className="text-center text-gray-500">
        Nenhum vídeo disponível nesta coleção.
      </p>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Coluna do Player com proporção correta */}
      <div className="lg:col-span-2 w-full aspect-video">
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
      <div className="w-full max-h-96 lg:max-h-[500px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-300">
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
