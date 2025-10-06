import React, { useState, useEffect } from "react";
import Image from "next/image";

const rakusaiFilterStrings = [
  // Amarela (#ffd800)
  "invert(81%) sepia(39%) saturate(2947%) hue-rotate(359deg) brightness(107%) contrast(111%)",
  // Rosa (#e40788)
  "invert(19%) sepia(93%) saturate(5430%) hue-rotate(314deg) brightness(89%) contrast(104%)",
  // Roxo (#b000b0)
  "invert(13%) sepia(76%) saturate(5574%) hue-rotate(294deg) brightness(90%) contrast(117%)",
];

export default function Loading({ message = "Carregando..." }) {
  const [filterStyle, setFilterStyle] = useState(
    "invert(81%) sepia(39%) saturate(2947%) hue-rotate(359deg) brightness(107%) contrast(111%)",
  );

  useEffect(() => {
    const randomFilter =
      rakusaiFilterStrings[
        Math.floor(Math.random() * rakusaiFilterStrings.length)
      ];
    setFilterStyle(randomFilter);
  }, []);

  return (
    // O overlay de fundo, cobrindo a tela inteira
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="relative w-24 h-24">
        <Image
          src="/images/loader-icon.svg"
          alt="Ícone de carregamento do Rakusai Taiko"
          fill
          style={{
            animation: "rakusai-spin 2s infinite",
            animationTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
            filter: filterStyle,
          }}
        />
      </div>

      {/* Mensagem de texto opcional */}
      {message && (
        <p className="mt-4 text-lg font-semibold text-white">{message}</p>
      )}

      {/* Estilos CSS para a animação de rotação customizada */}
      <style jsx>{`
        @keyframes rakusai-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
