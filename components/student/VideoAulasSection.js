import React, { useState, useMemo, useEffect } from "react";
import { settings } from "config/settings";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Image from "next/image";

// --- Sub-componente para o Card de Vídeo ---
const VideoCard = ({ video }) => (
  <a
    href={`https://www.youtube.com/watch?v=${video.videoId}`}
    target="_blank"
    rel="noopener noreferrer"
    className="block group"
  >
    <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
      <Image
        src={video.thumbnail}
        alt={video.title}
        fill
        style={{ objectFit: "cover" }}
        className="group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
    </div>
    <p className="mt-2 font-semibold text-gray-700 group-hover:text-rakusai-purple transition-colors truncate">
      {video.title}
    </p>
  </a>
);

// --- Sub-componente para o Carrossel de uma Coleção ---
const PlaylistCarousel = ({ collection }) => (
  <div className="space-y-4">
    {collection.title && (
      <h3 className="text-2xl font-bold text-gray-800">{collection.title}</h3>
    )}
    {collection.description && (
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: collection.description }}
      />
    )}

    <Swiper
      modules={[Navigation, Pagination]}
      navigation
      pagination={{ clickable: true }}
      spaceBetween={20}
      slidesPerView={1}
      breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
      className="w-full pb-10 swiper-light-controls"
    >
      {collection.videos.map((video, index) => (
        <SwiperSlide key={index}>
          <VideoCard video={video} />
        </SwiperSlide>
      ))}
    </Swiper>
  </div>
);

// --- Componente Principal com a Lógica Corrigida ---
export default function VideoAulasSection({
  user,
  collections,
  youtubeApiKey,
}) {
  const [modalidade, setModalidade] = useState("taiko");
  const [nivel, setNivel] = useState(null);
  const [processedCollections, setProcessedCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const nivelOrder = { iniciante: 0, intermediario: 1, avancado: 2, admin: 3 };

  useEffect(() => {
    const processCollections = async () => {
      if (!youtubeApiKey || !collections) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const processed = await Promise.all(
        collections.map(async (collection) => {
          const videoPromises = collection.youtubeLinks.map((link) =>
            processYouTubeLink(link, youtubeApiKey),
          );
          const videosArrays = await Promise.all(videoPromises);
          return { ...collection, videos: videosArrays.flat().filter(Boolean) };
        }),
      );
      setProcessedCollections(processed.filter((c) => c.videos.length > 0));
      setIsLoading(false);
    };
    processCollections();
  }, [collections, youtubeApiKey]);

  const userNiveis = useMemo(() => {
    const niveis = { taiko: -1, fue: -1 };
    if (!user.features) return niveis;

    settings.nivel.taiko.forEach((n) => {
      if (user.features.includes(n.feature) && n.ord > niveis.taiko) {
        niveis.taiko = n.ord;
      }
    });
    settings.nivel.fue.forEach((n) => {
      if (user.features.includes(n.feature) && n.ord > niveis.fue) {
        niveis.fue = n.ord;
      }
    });
    return niveis;
  }, [user.features]);

  const availableContent = useMemo(() => {
    const content = {
      taiko: { iniciante: [], intermediario: [], avancado: [], admin: [] },
      fue: { iniciante: [], intermediario: [], avancado: [], admin: [] },
      hasTaiko: false,
      hasFue: false,
      availableNiveis: { taiko: new Set(), fue: new Set() },
    };

    processedCollections.forEach((collection) => {
      collection.niveis.forEach((nivelFeature) => {
        const [_, mod, niv] = nivelFeature.split(":");

        // CORREÇÃO: A verificação agora usa a ordem numérica diretamente
        const userHighestOrd = userNiveis[mod];
        const requiredOrd = nivelOrder[niv];

        if (userHighestOrd >= requiredOrd) {
          content[mod][niv].push(collection);
          content[`has${mod.charAt(0).toUpperCase() + mod.slice(1)}`] = true;
          content.availableNiveis[mod].add(niv);
        }
      });
    });
    return content;
  }, [processedCollections, userNiveis, nivelOrder]);

  useEffect(() => {
    if (isLoading) return;
    let initialMod = availableContent.hasTaiko
      ? "taiko"
      : availableContent.hasFue
        ? "fue"
        : null;

    if (initialMod) {
      setModalidade(initialMod);
      const highestNivelOrd = userNiveis[initialMod];
      const highestNivelLabel = Object.keys(nivelOrder).find(
        (key) => nivelOrder[key] === highestNivelOrd,
      );
      setNivel(highestNivelLabel);
    }
  }, [isLoading, availableContent, userNiveis, nivelOrder]);

  if (isLoading) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <p>A carregar vídeo aulas...</p>
      </div>
    );
  }

  if (!availableContent.hasTaiko && !availableContent.hasFue) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center">
        <p className="text-gray-500">
          Ainda estamos a preparar novas vídeo aulas. Volte em breve!
        </p>
      </div>
    );
  }

  const collectionsToRender = nivel
    ? availableContent[modalidade]?.[nivel]
    : [];

  return (
    <div className="space-y-8">
      {availableContent.hasTaiko && availableContent.hasFue && (
        <div className="flex justify-center bg-gray-200 p-1 rounded-full">
          <button
            onClick={() => setModalidade("taiko")}
            className={`px-6 py-2 rounded-full font-semibold transition-colors ${modalidade === "taiko" ? "bg-white shadow text-rakusai-purple" : "text-gray-600"}`}
          >
            Taiko
          </button>
          <button
            onClick={() => setModalidade("fue")}
            className={`px-6 py-2 rounded-full font-semibold transition-colors ${modalidade === "fue" ? "bg-white shadow text-rakusai-purple" : "text-gray-600"}`}
          >
            Fue
          </button>
        </div>
      )}

      <div className="flex justify-center gap-2 flex-wrap">
        {Object.keys(nivelOrder).map((niv) => {
          const hasContent =
            availableContent.availableNiveis[modalidade].has(niv);
          if (!hasContent) return null;
          const userHasAccess = userNiveis[modalidade] >= nivelOrder[niv];
          if (!userHasAccess) return null;

          const label = settings.nivel[modalidade].find(
            (n) => n.ord === nivelOrder[niv],
          ).label;

          return (
            <button
              key={niv}
              onClick={() => setNivel(niv)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${nivel === niv ? "bg-rakusai-purple text-white" : "bg-gray-200 text-gray-700"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="space-y-12">
        {collectionsToRender && collectionsToRender.length > 0
          ? collectionsToRender.map((collection, index) => (
              <PlaylistCarousel key={index} collection={collection} />
            ))
          : nivel && (
              <div className="bg-white p-8 rounded-lg shadow">
                <p className="text-gray-500">
                  Nenhuma coleção de vídeos encontrada para este nível.
                </p>
              </div>
            )}
      </div>
    </div>
  );
}

// --- Função Auxiliar para a API do YouTube ---
async function processYouTubeLink(link, apiKey) {
  try {
    const playlistId = new URL(link).searchParams.get("list");
    if (playlistId) {
      console.log(
        "DEBUG 3: É uma PLAYLIST. Buscando vídeos para o ID:",
        playlistId,
      );

      // É uma playlist
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`,
      );
      const data = await response.json();
      return data.items.map((item) => ({
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        videoId: item.snippet.resourceId.videoId,
      }));
    } else {
      // É um vídeo único
      const videoId = new URL(link).searchParams.get("v");
      console.log(
        "DEBUG 3: É um VÍDEO ÚNICO. Buscando informações para o ID:",
        videoId,
      );

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
      );
      const data = await response.json();
      const video = data.items[0];
      return [
        {
          title: video.snippet.title,
          thumbnail: video.snippet.thumbnails.high.url,
          videoId: video.id,
        },
      ];
    }
  } catch (error) {
    console.error("Erro ao processar link do YouTube:", error);
    return [];
  }
}
