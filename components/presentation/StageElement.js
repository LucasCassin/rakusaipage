import React from "react";
import Image from "next/image";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./ItemTypes";

/**
 * Renderiza um único elemento (ícone + nome) no mapa de palco.
 * ATUALIZADO: Sem fundo, ícone maior.
 */
export default function StageElement({
  element,
  loggedInUser,
  isEditorMode,
  onClick,
}) {
  const isHighlighted =
    loggedInUser && element.assigned_user_id === loggedInUser.id;

  const iconUrl = element.image_url || "/favicon.svg";
  // --- MUDANÇA (BUG 4): Ícone maior ---
  const iconSize = 64;
  // --- FIM DA MUDANÇA ---

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.STAGE_ELEMENT,
      item: {
        type: ItemTypes.STAGE_ELEMENT,
        id: element.id,
        x: element.position_x,
        y: element.position_y,
      },
      canDrag: () => isEditorMode,
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [isEditorMode, element.id, element.position_x, element.position_y],
  );

  const handleClick = (e) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
    if (isEditorMode && onClick) {
      onClick(element);
    }
  };

  // --- MUDANÇA (BUG 4): Classes de Destaque ---
  // O anel agora é aplicado DIRETAMENTE na imagem
  const highlightClasses = isHighlighted
    ? "ring-4 ring-rakusai-pink-light animate-pulse rounded-md"
    : "";
  // --- FIM DA MUDANÇA ---

  return (
    <div
      ref={drag}
      onClick={handleClick}
      className={`absolute flex flex-col items-center
        ${isEditorMode ? "cursor-move" : ""}
        ${isDragging ? "opacity-30" : "opacity-100"}
        ${isEditorMode && !isDragging ? "hover:scale-110 transition-transform hover:cursor-pointer" : ""} 
      `}
      style={{
        left: `${element.position_x}%`,
        top: `${element.position_y}%`,
        transform: "translate(-50%, -50%)",
        width: `${iconSize}px`,
      }}
    >
      {/* --- MUDANÇA (BUG 4): Ícone sem Fundo/Borda --- */}
      <div
        className={`relative flex items-center justify-center w-auto h-auto`}
      >
        <Image
          src={iconUrl}
          alt={element.element_type_name}
          width={iconSize}
          height={iconSize}
          className={`object-contain ${highlightClasses} transition-all duration-300`}
        />
      </div>
      {/* --- FIM DA MUDANÇA --- */}

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
