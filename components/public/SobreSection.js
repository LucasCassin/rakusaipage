import React, { useMemo } from "react";
import { BookOpenIcon, MusicalNoteIcon } from "@heroicons/react/24/outline";
import Button from "../ui/Button";

// A seção agora recebe 'instrumentos' como prop
export default function SobreSection({ pageData, onOpenModal, instrumentos }) {
  const sobreContent = pageData?.homeSobre;
  const historiaTaikoContent = pageData?.homeHistoriaTaiko;

  // --- LÓGICA PARA CONSTRUIR O HTML DOS INSTRUMENTOS ---
  const instrumentosHtml = useMemo(() => {
    if (!instrumentos || instrumentos.length === 0) {
      return "<p>Em breve, mais informações sobre nossos instrumentos.</p>";
    }

    return (
      instrumentos
        .map((instrumento) => {
          // MUDANÇA: Usando 'float' para a imagem
          const imageHtml = instrumento.image
            ? `<div style="float: left; margin-right: 1rem; padding-top: 3.2rem;margin-bottom: 0.1rem; width: 150px;">
             <img src="${instrumento.image.url}" alt="${instrumento.title || "Instrumento do Rakusai Taiko"}" style="border-radius: 0.5rem; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);margin: 0px" />
           </div>`
            : "";

          const titleHtml = instrumento.title
            ? `<h2>${instrumento.title}</h2>`
            : "";

          // MUDANÇA: O container principal agora usa 'overflow: auto' para se ajustar ao float
          // e um 'padding-top' para criar espaço entre os itens
          return `
        <div style="overflow: auto; padding-top: 2rem;">
          ${imageHtml}
          ${titleHtml}
          ${instrumento.description}
        </div>
      `;
        })
        .join("") + '<div style="clear: both;"></div>'
    ); // Adiciona um clear final por segurança
  }, [instrumentos]);
  // ----------------------------------------------------

  if (!sobreContent) {
    return null;
  }

  // ----------------------------------------------------

  const sectionStyle = {
    backgroundColor: "#f0f0f0", // Cor de fallback
    ...(sobreContent.backgroundImage && {
      backgroundImage: `url(${sobreContent.backgroundImage.url})`,
      backgroundRepeat: "repeat-x", // Repete a imagem horizontalmente
      backgroundSize: "auto 100%", // Redimensiona a imagem para 100% da altura da seção
    }),
  };

  return (
    <section id="sobre" className="py-20 relative" style={sectionStyle}>
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(240, 240, 240, 0.4)" }} // Fundo cinza com 80% de opacidade
      ></div>
      <div className="container mx-auto px-6 text-center max-w-5xl relative">
        <h2 className="text-5xl font-bold text-gray-800 mb-4">
          Nossa Batida, Nossa História
        </h2>

        <span className="inline-block h-1 w-5/12 bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple rounded-full mb-8"></span>

        <div
          className="text-gray-700 leading-relaxed prose lg:prose-lg mx-auto prose-h1:font-sans prose-h2:font-sans prose-p:text-justify"
          dangerouslySetInnerHTML={{ __html: sobreContent.description }}
        />

        <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-6">
          <Button
            variant="secondary"
            onClick={() =>
              onOpenModal("História do Taiko", historiaTaikoContent.description)
            }
            className="w-full sm:w-auto"
          >
            <BookOpenIcon className="w-6 h-6 mr-3" />
            História do Taiko
          </Button>

          {/* O botão agora passa o HTML que construímos */}
          <Button
            variant="secondary"
            onClick={() => onOpenModal("Nossos Instrumentos", instrumentosHtml)}
            className="w-full sm:w-auto"
          >
            <MusicalNoteIcon className="w-6 h-6 mr-3" />
            Nossos Instrumentos
          </Button>
        </div>
      </div>
    </section>
  );
}
