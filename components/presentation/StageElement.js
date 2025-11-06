import React from "react";
import Image from "next/image";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./ItemTypes";

/**
 * Renderiza um único elemento (ícone + nome) no mapa de palco.
 * É "arrastável" (draggable) e "clicável" (clickable) no Modo Editor.
 */
export default function StageElement({
  element,
  loggedInUser,
  isEditorMode,
  onClick, // <-- 1. NOVA PROP (vem do hook 'modal.open')
}) {
  const isHighlighted =
    loggedInUser && element.assigned_user_id === loggedInUser.id;

  const iconUrl = element.image_url || "/favicon.svg";
  const iconSize = 64;

  const [{ isDragging }, drag] = useDrag(
    () => ({
      // ... (lógica 'useDrag' permanece a mesma) ...
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

  // --- 2. NOVA FUNÇÃO DE CLIQUE ---
  const handleClick = (e) => {
    // Impede o 'onClick' de disparar ao final de um 'onDrag'
    if (isDragging) {
      e.preventDefault();
      return;
    }

    // Só permite clicar para editar se estiver no modo editor
    if (isEditorMode && onClick) {
      onClick(element); // Chama modal.open(element)
    }
  };
  // --- FIM DA NOVA FUNÇÃO ---

  const highlightClasses = isHighlighted
    ? "ring-4 ring-rakusai-pink-light ring-offset-2 ring-offset-gray-900 animate-pulse"
    : "ring-1 ring-gray-900";

  return (
    <div
      ref={drag}
      onClick={handleClick} // <-- 3. ATRIBUIR O HANDLER
      className={`absolute flex flex-col items-center
        ${isEditorMode ? "cursor-move" : ""}
        ${isDragging ? "opacity-30" : "opacity-100"}
        ${isEditorMode && !isDragging ? "hover:scale-110 transition-transform hover:cursor-pointer" : ""} 
      `} // Feedback visual de clique/hover
      style={{
        left: `${element.position_x}%`,
        top: `${element.position_y}%`,
        transform: "translate(-50%, -50%)",
        width: `${iconSize}px`,
      }}
    >
      {/* ... (o ícone e o nome permanecem os mesmos) ... */}
      <div
        className={`relative flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg ${highlightClasses} transition-all duration-300`}
      >
        <Image
          src={iconUrl}
          alt={element.element_type_name}
          width={iconSize * 0.6}
          height={iconSize * 0.6}
          className="object-contain"
        />
      </div>
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
