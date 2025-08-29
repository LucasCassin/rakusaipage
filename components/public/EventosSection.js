import React from "react";
import Image from "next/image";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

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
      className="py-20 bg-white" // Fundo branco para alternar
    >
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-800 mb-4">
            Nossos Eventos
          </h2>
          <span className="inline-block h-1 w-5/12 bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple rounded-full mb-12"></span>
        </div>

        {/* 1. Descrição principal da seção */}
        {description && (
          <div
            className="text-gray-700 leading-relaxed prose lg:prose-lg mx-auto mb-16 prose-p:text-justify"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}

        {/* Próximas Apresentações */}
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
                    {/* MUDANÇA 1: O local agora é um link e não tem mais ícone */}
                    <a
                      href={event.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 mt-1 block hover:underline text-justify"
                    >
                      {event.locationName}
                    </a>
                  </div>
                  {/* MUDANÇA 2: O botão não encolhe mais */}
                  <button
                    onClick={() =>
                      onOpenTextModal(
                        event.title,
                        event.description,
                        event.googleMapsUrl,
                      )
                    }
                    className="bg-gray-800 text-white hover:bg-rakusai-purple font-semibold py-3 px-6 rounded-full transition-colors duration-300 w-full sm:w-auto flex-shrink-0"
                  >
                    Ver Detalhes
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Galeria de Vídeos */}
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
              // MUDANÇA PRINCIPAL: Usando a propriedade 'style' para forçar o padding
              className="w-full"
              style={{
                paddingTop: "1rem", // 16px de espaço no topo para o hover
                paddingBottom: "3rem", // 48px de espaço embaixo para as bolinhas
              }}
            >
              {videoUrls.map((url, index) => {
                const videoId = getYouTubeID(url);
                if (!videoId) return null;
                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                return (
                  <SwiperSlide key={index}>
                    <div
                      onClick={() => onOpenVideoModal(videoId)}
                      // O hover vai mover este container para cima, dentro do 'paddingTop' do Swiper
                      className="group cursor-pointer transform hover:-translate-y-2 transition-transform duration-300"
                    >
                      {/* Adicionamos overflow-hidden aqui para garantir que a imagem respeite os cantos arredondados */}
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
