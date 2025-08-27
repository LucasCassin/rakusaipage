"use client";

import React from "react";
import Image from "next/image";

// Importando os componentes e estilos do Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import { texts } from "src/utils/texts.js";

// Importando os arquivos CSS essenciais do Swiper
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

export default function HeroSection({ images }) {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    // O container principal que controla o posicionamento de todas as camadas
    <section className="relative h-screen w-full">
      {/* CAMADA 1: O Carrossel (no fundo de tudo) */}
      <Swiper
        modules={[Navigation, Pagination, Autoplay, EffectFade]}
        slidesPerView={1}
        loop={true}
        effect="fade"
        fadeEffect={{
          crossFade: true,
        }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        // pagination={{
        //   clickable: false,
        // }}
        navigation={false}
        className="absolute inset-0 h-full w-full"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <Image
              src={image.url}
              alt={image.description || "Imagem do carrossel do Rakusai Taiko"}
              fill
              style={{ objectFit: "cover" }}
              priority={index === 0}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* CAMADA 2: O Overlay (acima do carrossel) */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.5)] z-10"></div>

      {/* CAMADA 3: O Texto (acima de tudo) */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center text-white p-4">
        <h1 className="text-5xl md:text-7xl font-extrabold drop-shadow-md">
          {texts.sections.heroSection.title}
        </h1>
        <p className="mt-4 text-lg md:text-2xl max-w-2xl drop-shadow-md">
          {texts.sections.heroSection.description}
        </p>
      </div>
    </section>
  );
}
