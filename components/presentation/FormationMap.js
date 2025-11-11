import React, { useRef } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes"; //
import StageElement from "./StageElement"; //
import StageLine from "./StageLine";

/**
 * Renderiza o "Palco" ...
 * AGORA é um "drop target" para 'PaletteItem' E 'StageElement'.
 */
export default function FormationMap({
  elements = [],
  loggedInUser,
  onPaletteDrop,
  onElementMove,
  onElementClick,
  onElementDelete,
  onElementMerge, // <-- 1. RECEBER A NOVA PROP
  isEditorMode,
}) {
  const mapRef = useRef(null);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [ItemTypes.PALETTE_ITEM, ItemTypes.STAGE_ELEMENT],
      drop: (item, monitor) => {
        if (!isEditorMode || !mapRef.current) return;

        const offset = monitor.getClientOffset();
        const mapRect = mapRef.current.getBoundingClientRect();
        const x = ((offset.x - mapRect.left) / mapRect.width) * 100;
        const y = ((offset.y - mapRect.top) / mapRect.height) * 100;

        const itemType = monitor.getItemType();

        if (itemType === ItemTypes.PALETTE_ITEM && onPaletteDrop) {
          onPaletteDrop(item, { x, y });
        } else if (itemType === ItemTypes.STAGE_ELEMENT && onElementMove) {
          onElementMove(item.id, { x, y });
        }
      },
      canDrop: () => isEditorMode,
      collect: (monitor) => ({
        isOver: !!monitor.isOver() && isEditorMode,
      }),
    }),
    [isEditorMode, onPaletteDrop, onElementMove],
  );

  const combinedRef = (node) => {
    mapRef.current = node;
    drop(node);
  };

  return (
    <div
      ref={combinedRef}
      className={`relative w-full min-h-[500px] h-full
        bg-white
        border border-gray-300
        shadow-inner
        rounded-b-lg overflow-hidden p-4
        ${isEditorMode ? "cursor-move" : ""}
        ${isOver ? "ring-4 ring-rakusai-pink-light ring-inset" : ""} 
      `}
    >
      {elements.map((element) => {
        if (element.element_type_name === "Palco") {
          return (
            <StageLine
              key={element.id}
              element={element}
              isEditorMode={isEditorMode}
              onDelete={onElementDelete}
            />
          );
        }

        // Caso contrário, renderiza o Ícone padrão
        return (
          <StageElement
            key={element.id}
            element={element}
            loggedInUser={loggedInUser}
            isEditorMode={isEditorMode}
            onClick={onElementClick}
            onElementMerge={onElementMerge} // <-- 2. PASSAR A PROP PARA O ELEMENTO
          />
        );
      })}
      {elements.length === 0 && !isEditorMode && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500">Esta cena (formação) está vazia.</p>
        </div>
      )}
      {elements.length === 0 && isEditorMode && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-400 font-bold animate-pulse">
            Arraste um item da paleta para cá...
          </p>
        </div>
      )}
    </div>
  );
}
