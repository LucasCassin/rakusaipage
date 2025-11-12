import React from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import { FiX } from "react-icons/fi"; // <-- Importar o 'X'

/**
 * Renderiza um elemento "Palco" como uma linha divisória horizontal.
 */
export default function StageLine({
  element,
  isEditorMode,
  onDelete, // <-- 1. NOVA PROP (vem do 'deleteElement')
  globalScale,
}) {
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

  return (
    <div
      ref={drag}
      className={`absolute w-full h-4 flex items-center justify-center
        ${isEditorMode ? "cursor-ns-resize" : ""}
        ${isDragging ? "opacity-30" : "opacity-100"}
      `}
      style={{
        left: "0",
        top: `${element.position_y}%`,
        transform: `translateY(-50%) scale(${globalScale})`,
        transformOrigin: "top center",
      }}
    >
      <div
        className={`w-full h-px
        ${isEditorMode ? "bg-rakusai-yellow-dark" : "bg-gray-500"}`}
      ></div>

      {isEditorMode && (
        <div className="absolute px-2 py-0.5 bg-rakusai-yellow-dark text-black text-xs font-bold rounded-full">
          Palco
        </div>
      )}

      {isEditorMode && (
        <button
          type="button"
          onClick={() => onDelete(element.id)}
          className="absolute right-0 flex items-center justify-center w-6 h-6 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 focus:outline-none"
          aria-label="Deletar Linha do Palco"
        >
          <FiX className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
