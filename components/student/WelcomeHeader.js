import React from "react";
import Image from "next/image";

export default function WelcomeHeader({ user, welcomeData }) {
  const { title, subtitle, backgroundImage } = welcomeData || {};

  return (
    <div className="relative bg-gray-800 shadow-lg">
      {/* Imagem de Fundo com Overlay */}
      {backgroundImage && (
        <Image
          src={backgroundImage.url}
          alt={backgroundImage.description || "Fundo da área do aluno"}
          fill
          style={{ objectFit: "cover" }}
          className="opacity-40"
          priority
        />
      )}

      {/* Conteúdo de Texto */}
      <div className="relative max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {title} {user.username}!
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-xl text-gray-300">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
