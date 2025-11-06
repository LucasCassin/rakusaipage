import React, { useRef } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes"; //
import StageElement from "./StageElement"; //

/**
 * Renderiza o "Palco" ...
 * AGORA é um "drop target" para 'PaletteItem' E 'StageElement'.
 */
export default function FormationMap({
  elements = [],
  loggedInUser,
  onPaletteDrop, // (veio do hook)
  onElementMove, // <-- 1. NOVA PROP (veio do hook)
  isEditorMode,
  onElementClick,
}) {
  const mapRef = useRef(null);

  // --- 2. ATUALIZAR O useDrop ---
  const [{ isOver }, drop] = useDrop(
    () => ({
      // Aceita AMBOS os tipos
      accept: [ItemTypes.PALETTE_ITEM, ItemTypes.STAGE_ELEMENT],

      drop: (item, monitor) => {
        if (!isEditorMode || !mapRef.current) return;

        // Calcula a posição x/y (mesma lógica)
        const offset = monitor.getClientOffset();
        const mapRect = mapRef.current.getBoundingClientRect();
        const x = ((offset.x - mapRect.left) / mapRect.width) * 100;
        const y = ((offset.y - mapRect.top) / mapRect.height) * 100;

        // --- Lógica de Roteamento ---
        const itemType = monitor.getItemType();

        if (itemType === ItemTypes.PALETTE_ITEM && onPaletteDrop) {
          // Soltou um item NOVO da paleta
          onPaletteDrop(item, { x, y });
        } else if (itemType === ItemTypes.STAGE_ELEMENT && onElementMove) {
          // Moveu um item QUE JÁ ESTAVA no palco
          onElementMove(item.id, { x, y });
        }
      },

      canDrop: () => isEditorMode,
      collect: (monitor) => ({
        isOver: !!monitor.isOver() && isEditorMode,
      }),
    }),
    [isEditorMode, onPaletteDrop, onElementMove],
  ); // <-- 3. ADICIONAR DEPENDÊNCIA
  // --- FIM DA ATUALIZAÇÃO ---

  const combinedRef = (node) => {
    mapRef.current = node;
    drop(node);
  };

  return (
    <div
      ref={combinedRef}
      className={`relative w-full min-h-[500px] h-full bg-gray-900 rounded-b-lg overflow-hidden p-4
        ${isEditorMode ? "cursor-move" : ""}
        ${isOver ? "ring-4 ring-rakusai-pink-light ring-inset" : ""} 
      `}
    >
      {/* ... (fundo de pattern) ... */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "url(/images/pattern.svg)",
          backgroundSize: "cover",
        }}
      />

      {/* --- 4. ATUALIZAÇÃO DO MAP ---
        Precisamos passar 'isEditorMode' para o StageElement 
        para que ele saiba se deve ser arrastável.
      */}
      {elements.map((element) => (
        <StageElement
          key={element.id}
          element={element}
          loggedInUser={loggedInUser}
          isEditorMode={isEditorMode}
          onClick={onElementClick} // <-- PASSAR PROP
        />
      ))}
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
