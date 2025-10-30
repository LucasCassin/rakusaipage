import React, { useState, useRef } from "react";
import Button from "../ui/Button";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules"; // MUDANÇA: Removido 'Navigation'
import "swiper/css";
import "swiper/css/pagination"; // MUDANÇA: Removido 'swiper/css/navigation'

export default function ComunicadoModal({
  isOpen,
  onClose,
  onDismiss,
  comunicados,
}) {
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!isOpen || !comunicados || comunicados.length === 0) {
    return null;
  }

  const handleNext = () => swiperRef.current?.swiper.slideNext();
  const handlePrev = () => swiperRef.current?.swiper.slidePrev();

  const isLastSlide = activeIndex === comunicados.length - 1;
  const isFirstSlide = activeIndex === 0;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl bg-white rounded-lg shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Swiper
          ref={swiperRef}
          modules={[Pagination]} // MUDANÇA: Removido 'Navigation'
          // pagination={{ clickable: true }} // MUDANÇA: Adicionada paginação com bolinhas
          className="w-full"
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
        >
          {comunicados.map((comunicado, index) => (
            <SwiperSlide key={index}>
              <div className="flex flex-col max-h-[calc(90vh-100px)]">
                <header className="p-6 border-b flex-shrink-0">
                  <h2 className="text-3xl font-bold text-gray-800">
                    {comunicado.title}
                  </h2>
                </header>

                <main className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400">
                  <div
                    className="prose lg:prose-lg max-w-none prose-p:text-justify"
                    dangerouslySetInnerHTML={{ __html: comunicado.description }}
                  />
                </main>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* MUDANÇA: Novo layout do rodapé com grupos de botões */}
        <footer className="p-4 bg-gray-50 rounded-b-lg flex flex-col sm:flex-row justify-between items-center gap-4 mt-auto">
          {/* Grupo da Esquerda */}
          <div className="w-full sm:w-auto">
            {comunicados[activeIndex].canDismissSplash && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => onDismiss(comunicados[activeIndex])}
                className="w-full sm:w-auto"
              >
                Não mostrar novamente
              </Button>
            )}
          </div>

          {/* Grupo da Direita */}
          <div className="flex w-full sm:w-auto gap-4">
            <Button
              variant="secondary"
              size="small"
              onClick={handlePrev}
              disabled={isFirstSlide} // Botão desativado no primeiro slide
              className="w-full sm:w-auto h-10"
            >
              Anterior
            </Button>

            <Button
              variant="primary"
              onClick={isLastSlide ? onClose : handleNext}
              size="small"
              className="w-full sm:w-auto h-10"
            >
              {isLastSlide ? "Entendi" : "Próximo"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
