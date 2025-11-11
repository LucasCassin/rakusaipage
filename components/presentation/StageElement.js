import React from "react";
import Image from "next/image";
// 1. IMPORTAR 'useDrop'
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";

/**
 * Renderiza um único elemento (ícone + nome) no mapa de palco.
 * ATUALIZADO:
 * 1. Usa 'scale' e 'image_url_highlight'.
 * 2. É um 'useDrag' (para mover).
 * 3. É um 'useDrop' (para fundir/agrupar).
 */
export default function StageElement({
  element,
  loggedInUser,
  isEditorMode,
  onClick,
  onElementMerge, // <-- 2. RECEBER A PROP DE MERGE
}) {
  const isHighlighted =
    loggedInUser && element.assigned_user_id === loggedInUser.id;

  const iconUrl =
    isHighlighted && element.image_url_highlight
      ? element.image_url_highlight
      : element.image_url || "/favicon.svg";

  const scale = element.scale || 1.0;
  const iconSize = 24;

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.STAGE_ELEMENT,
      item: {
        type: ItemTypes.STAGE_ELEMENT,
        id: element.id,
        group_id: element.group_id, // Passa o group_id
        x: element.position_x,
        y: element.position_y,
      },
      canDrag: () => isEditorMode,
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [
      isEditorMode,
      element.id,
      element.position_x,
      element.position_y,
      element.group_id,
    ],
  );

  // --- 3. ADICIONAR O 'useDrop' PARA FUNDIR ---
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ItemTypes.STAGE_ELEMENT, // Só aceita outros elementos do palco
      drop: (droppedItem, monitor) => {
        // 'droppedItem' é o item que está sendo arrastado (dragged)
        // 'element' é o item que está recebendo (target)
        if (onElementMerge && element.id !== droppedItem.id) {
          onElementMerge(element, droppedItem); // (target, dragged)
        }
      },
      canDrop: (droppedItem) => isEditorMode && element.id !== droppedItem.id, // Não pode dropar em si mesmo
      collect: (monitor) => ({
        isOver:
          isEditorMode &&
          monitor.canDrop() &&
          !!monitor.isOver({ shallow: true }),
      }),
    }),
    [isEditorMode, onElementMerge, element], // Adicionar 'element' e 'onElementMerge'
  );
  // --- FIM DA ADIÇÃO ---

  const handleClick = (e) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
    if (isEditorMode && onClick) {
      onClick(element);
    }
  };

  // Feedback visual quando um item está prestes a ser agrupado
  const mergeHoverClasses =
    isOver && !isDragging
      ? "ring-8 ring-rakusai-purple ring-inset animate-pulse" // Anel roxo para merge
      : "";

  return (
    // 4. COMBINAR OS REFS 'drag' E 'drop'
    <div
      ref={(node) => drag(drop(node))}
      onClick={handleClick}
      className={`absolute flex flex-col items-center
        ${isEditorMode ? "cursor-move" : ""}
        ${isDragging ? "opacity-30" : "opacity-100"}
        ${isEditorMode && !isDragging ? "hover:scale-110 transition-transform hover:cursor-pointer" : ""} 
        ${mergeHoverClasses} // Adiciona o feedback de merge
      `}
      style={{
        left: `${element.position_x}%`,
        top: `${element.position_y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className={`relative flex items-center justify-center w-auto h-auto`}
      >
        <Image
          src={iconUrl}
          alt={element.element_type_name || ""}
          width={iconSize}
          height={iconSize}
          className={`object-contain transition-all duration-300`}
          style={{ transform: `scale(${scale})` }}
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
