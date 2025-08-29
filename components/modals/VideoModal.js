import React from "react";

export default function VideoModal({ isOpen, onClose, videoId }) {
  if (!isOpen || !videoId) {
    return null;
  }

  return (
    // O overlay de fundo com um pouco mais de padding para o vídeo "respirar"
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 transition-opacity duration-300"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
        aria-label="Fechar modal"
      >
        <span className="text-2xl font-bold">&times;</span>
      </button>

      <div
        className="relative w-full max-h-full aspect-w-16 aspect-h-9"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title="Player de vídeo do YouTube"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full rounded-lg shadow-2xl bg-black"
        ></iframe>
      </div>
    </div>
  );
}
