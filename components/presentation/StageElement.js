import React from "react";
import Image from "next/image"; // Para renderizar o ícone (SVG/PNG)

/**
 * Renderiza um único elemento (ícone + nome) no mapa de palco.
 * Contém a lógica de "Destaque".
 */
export default function StageElement({ element, loggedInUser }) {
  // A "Mágica do Destaque"
  const isHighlighted =
    loggedInUser && element.assigned_user_id === loggedInUser.id;

  // O 'findDeepById' já nos deu o 'element_type_name' e 'image_url'.
  const iconUrl = element.image_url || "/favicon.svg"; // Fallback
  const iconSize = 64; // 64px (podemos ajustar)

  // O CSS de Destaque
  // Um anel pulsante, borda brilhante, etc.
  const highlightClasses = isHighlighted
    ? "ring-4 ring-rakusai-pink-light ring-offset-2 ring-offset-gray-900 animate-pulse"
    : "ring-1 ring-gray-900"; // Um anel sutil para todos

  return (
    <div
      className="absolute flex flex-col items-center"
      // As posições x/y vêm do banco
      style={{
        left: `${element.position_x}%`,
        top: `${element.position_y}%`,
        transform: "translate(-50%, -50%)", // Centraliza o ícone no ponto x/y
        width: `${iconSize}px`,
      }}
    >
      {/* O Ícone */}
      <div
        className={`relative flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg ${highlightClasses} transition-all duration-300`}
      >
        <Image
          src={iconUrl}
          alt={element.element_type_name}
          width={iconSize * 0.6} // 60% do tamanho do círculo
          height={iconSize * 0.6}
          className="object-contain"
        />
      </div>

      {/* O Nome (display_name) */}
      {element.display_name && (
        <span
          className={`mt-2 px-2 py-0.5 rounded-md text-xs font-semibold text-white shadow ${
            isHighlighted ? "bg-rakusai-pink" : "bg-gray-800 bg-opacity-80"
          }`}
        >
          {element.display_name}
        </span>
      )}
    </div>
  );
}
