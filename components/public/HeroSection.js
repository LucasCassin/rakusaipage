"use client";

import React from "react";
import Image from "next/image";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-fade";

export default function HeroSection({ images }) {
  if (!images || images.length === 0) {
    return null;
  }

  return (
    <section className="relative h-screen w-full">
      {/* CAMADA 1: O Carrossel (fundo) */}
      <Swiper
        modules={[Autoplay, EffectFade]}
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

      {/* CAMADA 2: O Overlay */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.5)] z-10"></div>

      {/* Container do Logo */}
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        {/* MUDANÇA AQUI: As classes de largura agora são responsivas */}
        <div className="relative h-[80vh] w-[80vw] md:w-[55vw]">
          <Image
            src="/images/logoColoridoV2.svg"
            alt="Logo Rakusai Taiko Colorido"
            fill
            style={{ objectFit: "contain" }}
            priority
            className="drop-shadow-lg"
          />
        </div>
      </div>

      {/* MUDANÇA: CAMADA 4 - A Seta Animada para Rolar */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <a href="#sobre" aria-label="Rolar para a próxima seção">
          <div className="w-10 h-10 md:w-12 md:h-12 text-white/70 animate-bounce">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m19.5 8.25-7.5 7.5-7.5-7.5"
              />
            </svg>
          </div>
        </a>
      </div>
    </section>
  );
}
