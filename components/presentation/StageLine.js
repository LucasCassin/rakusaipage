import React from "react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./ItemTypes"; //

/**
 * Renderiza um elemento "Palco" como uma linha divisória horizontal.
 * É arrastável (para cima e para baixo) no Modo Editor.
 */
export default function StageLine({ element, isEditorMode }) {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.STAGE_ELEMENT, // É o mesmo tipo, pois já está no palco
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
      className={`absolute w-full h-2 flex items-center justify-center
        ${isEditorMode ? "cursor-ns-resize" : ""}
        ${isDragging ? "opacity-30" : "opacity-100"}
      `}
      style={{
        // A 'position_x' é ignorada, a linha sempre ocupa 100% da largura
        left: "0",
        top: `${element.position_y}%`, // A única posição que importa
        transform: "translateY(-50%)", // Centraliza a linha
      }}
    >
      {/* A linha visível */}
      <div
        className={`w-full h-0.5
        ${isEditorMode ? "bg-rakusai-yellow-dark" : "bg-white bg-opacity-30"}`}
      ></div>

      {/* "Alça" de arraste (só visível no modo editor) */}
      {isEditorMode && (
        <div className="absolute px-2 py-0.5 bg-rakusai-yellow-dark text-black text-xs font-bold rounded-full">
          PALCO
        </div>
      )}
    </div>
  );
}
