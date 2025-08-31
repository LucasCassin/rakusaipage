import React from "react";
import Image from "next/image";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Button from "../ui/Button";

// Helper para extrair o ID do vídeo do YouTube
const getYouTubeID = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

// Componente para o bloco de data formatado
const DateBlock = ({ dateString }) => {
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const correctedDate = new Date(date.getTime() + userTimezoneOffset);
  const day = correctedDate.getDate();
  const month = correctedDate
    .toLocaleString("pt-BR", { month: "short" })
    .toUpperCase()
    .replace(".", "");
  return (
    <div className="text-center bg-rakusai-pink text-white p-2 rounded-lg w-20 h-20 flex flex-col justify-center shadow-md flex-shrink-0">
      <span className="text-4xl font-bold leading-tight">{day}</span>
      <span className="text-sm font-semibold tracking-wider">{month}</span>
    </div>
  );
};

// --- Componente Principal da Seção ---

export default function EventosSection({
  pageData,
  presentations,
  onOpenTextModal,
  onOpenVideoModal,
}) {
  const content = pageData?.homeApreEventos;

  if (!content) {
    return null;
  }

  const { description, videoUrls } = content;

  return (
    <section
      id="eventos"
      className="py-20"
      style={{ backgroundColor: "#f0f0f0" }}
    >
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">
            Nossos Eventos
          </h2>
          <span className="inline-block h-1 w-5/12 bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple rounded-full mb-12"></span>
        </div>

        {description && (
          <div
            className="text-gray-700 leading-relaxed prose lg:prose-lg mx-auto mb-16 prose-p:text-justify"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}

        {presentations && presentations.length > 0 && (
          <div id="agenda" className="mb-20">
            <h3 className="text-4xl font-bold text-gray-800 text-center mb-10">
              Agenda
            </h3>
            <div className="space-y-4">
              {presentations.map((event, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-lg shadow-xl border flex flex-col sm:flex-row items-center gap-4"
                >
                  <DateBlock dateString={event.date} />
                  <div className="flex-grow text-center sm:text-left">
                    <h4 className="text-2xl font-bold text-rakusai-purple">
                      {event.title}
                    </h4>
                    <a
                      href={event.googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 mt-1 block hover:underline text-justify"
                    >
                      {event.locationName}
                    </a>
                  </div>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      onOpenTextModal(
                        event.title,
                        event.description,
                        event.mapsLinkForModal, // Usando o link correto para o modal
                      )
                    }
                    className="w-full sm:w-auto flex-shrink-0"
                  >
                    Ver Detalhes
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {videoUrls && videoUrls.length > 0 && (
          <div
            id="apresentacoes"
            className="rounded-xl p-6 sm:p-10"
            style={{ backgroundColor: "#f7f7f7" }}
          >
            <h3 className="text-4xl font-bold text-gray-800 text-center mb-10">
              Apresentações Anteriores
            </h3>
            <Swiper
              modules={[Pagination]}
              pagination={{ clickable: true }}
              spaceBetween={30}
              slidesPerView={1}
              breakpoints={{
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              className="w-full"
              style={{ paddingTop: "1rem", paddingBottom: "3rem" }}
            >
              {videoUrls.map((url, index) => {
                const videoId = getYouTubeID(url);
                if (!videoId) return null;
                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                return (
                  <SwiperSlide key={index}>
                    <div
                      onClick={() => onOpenVideoModal(videoId)}
                      className="group cursor-pointer transform hover:-translate-y-2 transition-transform duration-300"
                    >
                      <div className="relative shadow-xl rounded-lg overflow-hidden">
                        <div className="aspect-w-16 aspect-h-9 bg-black">
                          <Image
                            src={thumbnailUrl}
                            alt={`Thumbnail do vídeo ${index + 1}`}
                            fill
                            style={{ objectFit: "cover" }}
                            className="transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center rounded-lg">
                          <PlayCircleIcon className="w-20 h-20 text-white opacity-80 group-hover:opacity-100 transform group-hover:scale-110 transition-all duration-300" />
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        )}
      </div>
    </section>
  );
}
