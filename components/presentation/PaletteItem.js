import React from "react";
import Image from "next/image";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./ItemTypes";

/**
 * Renderiza um item individual na paleta (ex: "Odaiko" ou "Renan (Odaiko)").
 * Agora é um item arrastável (draggable).
 */
export default function PaletteItem({ itemData }) {
  const {
    name, // O 'name' é o label formatado (ex: "Renan (Odaiko)")
    iconUrl,
    element_type_id,
    display_name,
    assigned_user_id,
    isTemplate,
    scale, // <-- 1. RECEBENDO (Correto)
    image_url_highlight, // <-- 1. RECEBENDO (Correto)
    element_type_name, // <-- 1. RECEBENDO (Correto)
  } = itemData;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PALETTE_ITEM,
    // 'item' é o payload de dados que o drop target (o Palco) receberá.
    item: {
      type: ItemTypes.PALETTE_ITEM,
      element_type_id,
      display_name,
      assigned_user_id,
      image_url: iconUrl,

      // --- INÍCIO DA CORREÇÃO (Bug 2) ---
      // 1. Passar o 'element_type_name' real, não o 'name' (label)
      element_type_name: element_type_name,

      // 2. Passar 'scale' e 'highlight' no payload do DND
      scale: scale,
      image_url_highlight: image_url_highlight,
      // --- FIM DA CORREÇÃO ---

      isTemplate,
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`flex items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-300 cursor-grab active:cursor-grabbing shadow-sm ${
        isDragging ? "opacity-50" : "opacity-100" // Feedback visual
      }`}
      // (Restaurando o 'touch-action-none' que corrige o conflito de scroll no mobile)
      style={{ touchAction: "none" }}
    >
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-inner overflow-hidden">
        <Image
          src={iconUrl || "/favicon.svg"}
          alt={name}
          width={28}
          height={28}
          className="object-contain"
          // (Aplicando 'scale' no ícone da paleta)
          style={{ transform: `scale(${scale || 1.0})` }}
        />
      </div>
      <span className="ml-3 font-medium text-sm text-gray-700">{name}</span>
    </div>
  );
}
