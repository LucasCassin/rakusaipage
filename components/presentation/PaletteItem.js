import React from "react";
import Image from "next/image";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./ItemTypes";

/**
 * Renderiza um item individual na paleta (ex: "Odaiko" ou "Renan (Odaiko)").
 * ATUALIZADO: Inclui 'touch-action: none' para corrigir o conflito
 * de gesto (drag vs scroll) no mobile.
 */
export default function PaletteItem({ itemData }) {
  const {
    name,
    iconUrl,
    element_type_id,
    display_name,
    assigned_user_id,
    isTemplate,
    scale,
    image_url_highlight,
    element_type_name,
  } = itemData;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PALETTE_ITEM,
    item: {
      type: ItemTypes.PALETTE_ITEM,
      element_type_id,
      display_name,
      assigned_user_id,
      image_url: iconUrl,
      element_type_name: element_type_name,
      isTemplate,
      scale,
      image_url_highlight,
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      // --- CORREÇÃO (Bug #4) ---
      // 'touch-action-none' (equivalente a 'touch-action: none;')
      // impede que o navegador tente rolar a paleta quando o usuário
      // toca neste item, permitindo que o 'useDrag' capture o gesto.
      className={`touch-action-none flex items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-300 cursor-grab active:cursor-grabbing shadow-sm ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      // --- FIM DA CORREÇÃO ---
    >
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-inner overflow-hidden">
        <Image
          src={iconUrl || "/favicon.svg"}
          alt={name}
          width={28}
          height={28}
          className="object-contain"
          style={{ transform: `scale(${scale || 1.0})` }}
        />
      </div>
      <span className="ml-3 font-medium text-sm text-gray-700">{name}</span>
    </div>
  );
}
