import React, { useRef, useMemo, useState, useLayoutEffect } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import StageElement from "./StageElement";
import StageLine from "./StageLine";

const VIRTUAL_WIDTH = 1000;

/**
 * (NOVO) Componente interno para renderizar o nome do grupo.
 * ATUALIZADO: Recebe 'isHighlighted' para mudar a cor.
 */
const GroupLabel = ({ label, x, y, isHighlighted, globalScale }) => {
  if (!label) return null;

  const highlightClasses = isHighlighted
    ? "bg-rakusai-pink"
    : "bg-gray-800 bg-opacity-80";

  return (
    <div
      className="absolute flex justify-center"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translateX(-50%) scale(${globalScale * 1.5})`,
        transformOrigin: "top center",
        pointerEvents: "none",
        width: "150px",
      }}
    >
      <span
        className={`mt-4 px-2 py-0.5 rounded-md text-xs font-semibold text-white shadow text-center ${highlightClasses}`}
      >
        {label}
      </span>
    </div>
  );
};

/**
 * Renderiza o "Palco".
 * ATUALIZADO:
 * 1. Garante 'parseFloat' nos cálculos de posição (Bug 1).
 * 2. Passa dados de 'highlight' para o 'GroupLabel' (Bug 2).
 */
export default function FormationMap({
  elements = [],
  loggedInUser,
  onPaletteDrop,
  onElementMove,
  onElementClick,
  onElementDelete,
  onElementMerge,
  isEditorMode,
}) {
  const mapRef = useRef(null);

  const [actualWidth, setActualWidth] = useState(VIRTUAL_WIDTH);

  // useLayoutEffect garante que medimos antes da pintura
  useLayoutEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    // Mede a largura real do div do mapa
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setActualWidth(entries[0].contentRect.width);
      }
    });
    resizeObserver.observe(element);
    return () => resizeObserver.unobserve(element);
  }, []); // Roda apenas uma vez na montagem

  // 6. CALCULAR A ESCALA GLOBAL
  const globalScale = actualWidth / VIRTUAL_WIDTH;

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: [ItemTypes.PALETTE_ITEM, ItemTypes.STAGE_ELEMENT],
      drop: (item, monitor) => {
        if (!isEditorMode || !mapRef.current) return;
        const offset = monitor.getClientOffset();
        if (!offset) return;
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

  const processedGroups = useMemo(() => {
    const groups = new Map();

    for (const element of elements) {
      if (!groups.has(element.group_id)) {
        groups.set(element.group_id, {
          group_id: element.group_id,
          display_name: element.display_name,

          assigned_user_id: element.assigned_user_id,

          elements: [],
        });
      }
      groups.get(element.group_id).elements.push(element);
    }

    const groupsWithLabels = [];
    for (const group of groups.values()) {
      if (group.elements.length === 0) continue;
      if (group.elements[0]?.element_type_name === "Palco") {
        groupsWithLabels.push({ ...group, labelPosition: null });
        continue;
      }

      let minX = 100,
        maxX = 0,
        maxY = 0;

      for (const el of group.elements) {
        const elX = parseFloat(el.position_x);
        const elY = parseFloat(el.position_y);

        if (elX < minX) minX = elX;
        if (elX > maxX) maxX = elX;
        if (elY > maxY) maxY = elY;
      }

      group.labelPosition = {
        x: (minX + maxX) / 2,
        y: maxY + 2,
      };
      groupsWithLabels.push(group);
    }
    return groupsWithLabels;
  }, [elements]);

  const combinedRef = (node) => {
    mapRef.current = node;
    drop(node);
  };

  return (
    <div
      ref={combinedRef}
      className={`relative w-full h-full
        overflow-hidden p-4
        ${isEditorMode ? "cursor-move" : ""}
        ${isOver ? "ring-4 ring-rakusai-pink-light ring-inset" : ""} 
      `}
    >
      {processedGroups.map((group) => (
        <React.Fragment key={group.group_id}>
          {group.elements.map((element) => {
            if (element.element_type_name === "Palco") {
              return (
                <StageLine
                  key={element.id}
                  element={element}
                  isEditorMode={isEditorMode}
                  onDelete={onElementDelete}
                  globalScale={globalScale}
                />
              );
            }

            return (
              <StageElement
                key={element.id}
                element={element}
                loggedInUser={loggedInUser}
                isEditorMode={isEditorMode}
                onClick={onElementClick}
                onElementMerge={onElementMerge}
                globalScale={globalScale}
              />
            );
          })}

          {group.display_name && group.labelPosition && (
            <GroupLabel
              label={group.display_name}
              x={group.labelPosition.x}
              y={group.labelPosition.y}
              isHighlighted={
                loggedInUser && group.assigned_user_id === loggedInUser.id
              }
              globalScale={globalScale}
            />
          )}
        </React.Fragment>
      ))}

      {elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          {isEditorMode ? (
            <p className="font-bold animate-pulse text-center">
              Arraste um item da paleta para cá...
            </p>
          ) : (
            <p className="text-gray-500 text-center">
              Esta cena (formação) está vazia.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
