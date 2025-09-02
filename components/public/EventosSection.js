import React, { useState, useEffect } from "react";
import Image from "next/image";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import Button from "../ui/Button";

// --- Sub-componente para a Foto Polaroid ---
const PolaroidPhoto = ({ photo, transformClass, zIndexClass }) => {
  const [isHovered, setIsHovered] = React.useState(false);
  // MUDANÇA 1: Aumentado o z-index no hover para garantir que fique na frente
  const currentZIndexClass = isHovered ? "z-30" : zIndexClass;

  return (
    <div
      className={`absolute transition-all duration-300 hover:scale-110 ${transformClass} ${currentZIndexClass}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* MUDANÇA 2: A estrutura interna foi refeita com flexbox para controle total */}
      <div className="bg-white p-3 shadow-lg rounded-sm w-48 flex flex-col">
        {/* Container da Imagem */}
        <div className="relative w-full aspect-[3/4] bg-gray-200">
          <Image
            src={photo.url}
            alt={photo.description || "Foto de evento do Rakusai Taiko"}
            fill
            style={{
              objectFit: "cover",
              marginTop: "0px",
            }}
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
        {/* Container da Legenda */}
        <div className="pt-2 h-12 flex items-center justify-center">
          <p
            className="text-md font-medium font-handwriting text-gray-800 break-words"
            style={{ textAlign: "center", margin: "0px" }}
          >
            {photo.description || "Evento do Rakusai Taiko"}
          </p>
        </div>
      </div>
    </div>
  );
};

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

  const [parsedContent, setParsedContent] = useState(null);

  useEffect(() => {
    // A análise do HTML só pode acontecer no navegador (client-side)
    if (content?.description) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content.description, "text/html");
      const paragraphs = Array.from(doc.querySelectorAll("p"));
      const pCount = paragraphs.length;

      if (paragraphs.length === 0) {
        setParsedContent({ pCount: 0, fullHtml: content.description });
        return;
      }

      let firstP = "";
      let middlePs = "";
      let lastP = "";

      // --- LÓGICA DE SEPARAÇÃO ATUALIZADA ---
      if (pCount === 1) {
        // Se só tem 1, ele é o 'firstP'
        firstP = paragraphs[0].outerHTML;
      } else if (pCount === 2) {
        // Se tem 2, o primeiro é 'firstP', e o segundo é 'middlePs'
        firstP = paragraphs[0].outerHTML;
        middlePs = paragraphs[1].outerHTML;
        // 'lastP' fica vazio, então o Bloco 3 não será renderizado
      } else {
        // Se tem mais de 2
        // O primeiro é 'firstP'
        firstP = paragraphs[0].outerHTML;
        // Os DOIS últimos são 'lastP'
        lastP = paragraphs
          .slice(-2)
          .map((p) => p.outerHTML)
          .join("");
        // O 'meio' é tudo entre o primeiro e os dois últimos
        middlePs = paragraphs
          .slice(1, -2)
          .map((p) => p.outerHTML)
          .join("");
      }
      setParsedContent({
        pCount: paragraphs.length,
        firstP,
        middlePs,
        lastP,
      });
    }
  }, [content?.description]);

  const photoPairStyles = React.useMemo(
    () => [
      {
        first: {
          rot: "rotate-[0.08rad]",
          z: "z-10",
          pos: "translate-x-[2.5rem] -translate-y-3",
        },
        second: {
          rot: "-rotate-[0.1rad]",
          z: "z-20",
          pos: "translate-x-[-1.1rem] translate-y-[-0.6rem]",
        },
      },
      {
        first: {
          rot: "rotate-[0.1rad]",
          z: "z-20",
          pos: "translate-x-[2.5rem] -translate-y-3",
        },
        second: {
          rot: "-rotate-[0.1rad]",
          z: "z-10",
          pos: "translate-x-[-1.5rem] translate-y-[-1rem]",
        },
      },
      {
        first: {
          rot: "-rotate-[0.02rad]",
          z: "z-20",
          pos: "translate-x-[5rem] -translate-y-[1.4rem]",
        },
        second: {
          rot: "rotate-[0.03rad]",
          z: "z-10",
          pos: "translate-x-[-5rem] translate-y-[-0.8rem]",
        },
      },
    ],
    [],
  );

  if (!content) {
    return null;
  }

  const { videoUrls, images } = content;

  // Lógica para duplas de rotação aleatórias

  const firstPairStyle = photoPairStyles[0];
  const secondPairStyle = photoPairStyles[1];
  const mobilePairStyle = photoPairStyles[2];

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

        {parsedContent && (
          <div className="text-gray-700 leading-relaxed prose lg:prose-lg mx-auto mb-16 prose-p:text-justify">
            {/* Bloco 1: Fotos flutuando à direita, contornadas pelo primeiro parágrafo */}
            {images && images.length >= 2 && (
              <div className="float-right ml-6 mb-6 w-64 h-64 relative hidden md:flex justify-center items-center">
                <PolaroidPhoto
                  photo={images[0]}
                  transformClass={`${firstPairStyle.first.rot} ${firstPairStyle.first.pos}`}
                  zIndexClass={firstPairStyle.first.z}
                />
                <PolaroidPhoto
                  photo={images[1]}
                  transformClass={`${firstPairStyle.second.rot} ${firstPairStyle.second.pos}`}
                  zIndexClass={firstPairStyle.second.z}
                />
              </div>
            )}
            {parsedContent.firstP && (
              <div dangerouslySetInnerHTML={{ __html: parsedContent.firstP }} />
            )}

            {/* Bloco 2: Parágrafos do meio, ocupando a largura total */}
            {parsedContent.middlePs && (
              <div
                dangerouslySetInnerHTML={{ __html: parsedContent.middlePs }}
              />
            )}

            {/* Bloco 3: Fotos flutuando à esquerda, contornadas pelo último parágrafo */}
            {parsedContent.lastP && images && images.length >= 4 && (
              <div className="float-left mr-12 mt-12 mb-12 w-64 h-80 relative hidden md:flex justify-center items-center">
                <PolaroidPhoto
                  photo={images[2]}
                  transformClass={`${secondPairStyle.first.rot} ${secondPairStyle.first.pos}`}
                  zIndexClass={secondPairStyle.first.z}
                />
                <PolaroidPhoto
                  photo={images[3]}
                  transformClass={`${secondPairStyle.second.rot} ${secondPairStyle.second.pos}`}
                  zIndexClass={secondPairStyle.second.z}
                />
              </div>
            )}
            {parsedContent.lastP && (
              <div dangerouslySetInnerHTML={{ __html: parsedContent.lastP }} />
            )}

            {images && images.length >= 2 && (
              <div className="md:hidden mt-16 flex justify-center items-center h-64 relative">
                <PolaroidPhoto
                  photo={images[0]}
                  transformClass={`${mobilePairStyle.first.rot} ${mobilePairStyle.first.pos}`}
                  zIndexClass={mobilePairStyle.first.z}
                />
                <PolaroidPhoto
                  photo={images[1]}
                  transformClass={`${mobilePairStyle.second.rot} ${mobilePairStyle.second.pos}`}
                  zIndexClass={mobilePairStyle.second.z}
                />
              </div>
            )}

            {/* Elemento final para limpar os floats e garantir a integridade do layout */}
            <div className="clear-both"></div>
          </div>
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
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
