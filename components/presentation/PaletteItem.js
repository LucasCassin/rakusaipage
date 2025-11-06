import React from "react";
import Image from "next/image";

/**
 * Renderiza um item individual na paleta (ex: "Odaiko" ou "Renan (Odaiko)").
 * (Eventualmente será um item 'react-dnd')
 */
export default function PaletteItem({ name, iconUrl }) {
  return (
    <div className="flex items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-300 cursor-grab active:cursor-grabbing shadow-sm">
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-inner overflow-hidden">
        <Image
          src={iconUrl || "/favicon.svg"} // Fallback
          alt={name}
          width={28}
          height={28}
          className="object-contain"
        />
      </div>
      <span className="ml-3 font-medium text-sm text-gray-700">{name}</span>
    </div>
  );
}
