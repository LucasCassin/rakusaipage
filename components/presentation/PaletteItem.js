import React from "react";
import Image from "next/image";
import { useDrag } from "react-dnd"; // <-- 1. IMPORTAR
import { ItemTypes } from "./ItemTypes"; // <-- 2. IMPORTAR

/**
 * Renderiza um item individual na paleta (ex: "Odaiko" ou "Renan (Odaiko)").
 * Agora é um item arrastável (draggable).
 */
export default function PaletteItem({ itemData }) {
  // <-- 3. PROP MUDOU
  const {
    name,
    iconUrl,
    element_type_id,
    display_name,
    assigned_user_id,
    isTemplate, //
  } = itemData;

  // --- 4. CONFIGURAR O useDrag ---
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.PALETTE_ITEM, // Define o tipo de item
    // 'item' é o payload de dados que o drop target (o Palco) receberá.
    item: {
      type: ItemTypes.PALETTE_ITEM,
      element_type_id,
      display_name,
      assigned_user_id,
      image_url: iconUrl, // Passa a URL do ícone
      element_type_name: name, // Passa o nome do tipo
      isTemplate,
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(), // Pega o estado de "arrastando"
    }),
  }));
  // --- FIM DA CONFIGURAÇÃO ---

  return (
    // 5. ATRIBUIR O REF 'drag' AO ELEMENTO
    <div
      ref={drag}
      className={`flex items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-300 cursor-grab active:cursor-grabbing shadow-sm ${
        isDragging ? "opacity-50" : "opacity-100" // Feedback visual
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-inner overflow-hidden">
        <Image
          src={iconUrl || "/favicon.svg"}
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
