import React, { useRef, useMemo, useState, useLayoutEffect } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import StageElement from "./StageElement";
import StageLine from "./StageLine";
import { settings } from "config/settings.js"; // Importa as configs

const VIRTUAL_WIDTH = 1000;
const BASE_ICON_SIZE_PX = settings.global.STAGE_MAP_SNAP.BASE_ICON_SIZE_PX;

/**
 * (Componente interno) GroupLabel
 * (Recebe 'globalScale' da etapa anterior)
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
 * REVISADO: Implementa lógica de Snap ao "Mais Próximo"
 * e alinhamento "Lado a Lado" e "Empilhado".
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

  // --- Lógica de Escala Global (Mede Largura E Altura) ---
  const [dimensions, setDimensions] = useState({
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_WIDTH * (3 / 4), // (Assume 4:3 inicial)
  });

  useLayoutEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    // Mede as dimensões reais do mapa
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    resizeObserver.observe(element);

    // Define as dimensões iniciais corretas na montagem
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: rect.width, height: rect.height });
    }

    return () => resizeObserver.unobserve(element);
  }, []); // Roda apenas na montagem

  const globalScale = dimensions.width / VIRTUAL_WIDTH;
  const actualWidth = dimensions.width;
  const actualHeight = dimensions.height;
  // --- Fim da Lógica de Escala ---

  // --- Lógica de Alinhamento (Snap) REVISADA ---
  function getSnappedPosition(
    newPosition, // {x, y} - percentual
    elementToIgnoreId = null,
    draggedItemScale = 1.0, // (Escala do item sendo arrastado)
  ) {
    const { STAGE_MAP_SNAP } = settings.global;
    if (
      !STAGE_MAP_SNAP ||
      !elements ||
      elements.length === 0 ||
      actualWidth === 0 ||
      actualHeight === 0
    ) {
      return newPosition; // Retorna original
    }

    const otherElements = elements.filter((el) => el.id !== elementToIgnoreId);

    if (otherElements.length === 0) {
      return newPosition;
    }

    // 1. Encontrar o elemento mais próximo (Distância Manhattan)
    let closestElement = null;
    let minDistance = Infinity;

    for (const element of otherElements) {
      const elX = parseFloat(element.position_x);
      const elY = parseFloat(element.position_y);
      const distance =
        Math.abs(newPosition.x - elX) + Math.abs(newPosition.y - elY);

      if (distance < minDistance) {
        minDistance = distance;
        closestElement = element;
      }
    }

    // 2. Verificar se está dentro do 'Max Distance'
    if (
      !closestElement ||
      minDistance > STAGE_MAP_SNAP.SNAP_MAX_DISTANCE_PERCENT
    ) {
      return newPosition; // Longe demais, sem snap
    }

    // 3. Executar Lógica de Snap (Apenas no 'closestElement')
    let snappedX = newPosition.x;
    let snappedY = newPosition.y;

    const elX = parseFloat(closestElement.position_x);
    const elY = parseFloat(closestElement.position_y);
    const targetScale = closestElement.scale || 1.0;
    const draggedScale = draggedItemScale || 1.0;

    const snapXThreshold = STAGE_MAP_SNAP.SNAP_X_THRESHOLD;
    const snapYThreshold = STAGE_MAP_SNAP.SNAP_Y_THRESHOLD;

    // Calcular Meias-Dimensões (Considerando Escala Individual - Feedback 1)
    const newIconHalfWidthPercent =
      ((BASE_ICON_SIZE_PX * draggedScale) / 2 / actualWidth) * 100;
    const targetIconHalfWidthPercent =
      ((BASE_ICON_SIZE_PX * targetScale) / 2 / actualWidth) * 100;
    const newIconHalfHeightPercent =
      ((BASE_ICON_SIZE_PX * draggedScale) / 2 / actualHeight) * 100;
    const targetIconHalfHeightPercent =
      ((BASE_ICON_SIZE_PX * targetScale) / 2 / actualHeight) * 100;

    // A. LÓGICA Y (Alinhamento Horizontal - Centro a Centro)
    const yDiff = Math.abs(newPosition.y - elY);
    if (yDiff < snapYThreshold) {
      console.log("Logica Y");
      snappedY = elY;
    }

    // B. LÓGICA X (Alinhamento Vertical - Centro a Centro)
    const xDiff = Math.abs(newPosition.x - elX);
    if (xDiff < snapXThreshold) {
      console.log("Logica X");
      snappedX = elX;
    }

    // C. LÓGICA X (Lado a Lado - Borda a Borda - Feedback 3)
    // Alvo: Lado DIREITO do 'closestElement'
    const targetRight = elX + targetIconHalfWidthPercent;
    const xDiffRight = Math.abs(
      newPosition.x - (targetRight + newIconHalfWidthPercent),
    );
    if (xDiffRight < snapXThreshold) {
      console.log("Logica X Direita");
      snappedX = targetRight + newIconHalfWidthPercent;
    }

    // Alvo: Lado ESQUERDO do 'closestElement'
    const targetLeft = elX - targetIconHalfWidthPercent;
    const xDiffLeft = Math.abs(
      newPosition.x - (targetLeft - newIconHalfWidthPercent),
    );
    if (xDiffLeft < snapXThreshold) {
      console.log("Logica X Esquerda");
      snappedX = targetLeft - newIconHalfWidthPercent;
    }

    // D. LÓGICA Y (Empilhamento - Borda a Borda - Feature Adicionada)
    // Alvo: Lado INFERIOR do 'closestElement'
    const targetBottom = elY + targetIconHalfHeightPercent;
    const yDiffBottom = Math.abs(
      newPosition.y - (targetBottom + newIconHalfHeightPercent),
    );
    if (yDiffBottom < snapYThreshold) {
      console.log("Logica Y Inferior");
      snappedY = targetBottom + newIconHalfHeightPercent;
    }

    // Alvo: Lado SUPERIOR do 'closestElement'
    const targetTop = elY - targetIconHalfHeightPercent;
    const yDiffTop = Math.abs(
      newPosition.y - (targetTop - newIconHalfHeightPercent),
    );
    if (yDiffTop < snapYThreshold) {
      console.log("Logica Y Superior");
      snappedY = targetTop - newIconHalfHeightPercent;
    }

    return { x: snappedX, y: snappedY };
  }
  // --- Fim da Lógica de Alinhamento ---

  // --- Lógica de Drop (Atualizada com Escala do Item Arrastado) ---
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

        const initialPosition = { x, y };
        const itemType = monitor.getItemType();

        // Determinar a escala do item sendo arrastado
        let draggedItemScale = 1.0;
        if (itemType === ItemTypes.PALETTE_ITEM) {
          draggedItemScale = item.scale || 1.0; // Pega do PaletteItem
        } else if (itemType === ItemTypes.STAGE_ELEMENT) {
          draggedItemScale = item.scale || 1.0; // Pega do StageElement (corrigido)
        }

        // Aplicar Snap
        if (itemType === ItemTypes.PALETTE_ITEM && onPaletteDrop) {
          const snappedPosition = getSnappedPosition(
            initialPosition,
            null,
            draggedItemScale,
          );
          onPaletteDrop(item, snappedPosition);
        } else if (itemType === ItemTypes.STAGE_ELEMENT && onElementMove) {
          const snappedPosition = getSnappedPosition(
            initialPosition,
            item.id,
            draggedItemScale,
          );
          onElementMove(item.id, snappedPosition);
        }
      },
      canDrop: () => isEditorMode,
      collect: (monitor) => ({
        isOver: !!monitor.isOver() && isEditorMode,
      }),
    }),
    [
      isEditorMode,
      onPaletteDrop,
      onElementMove,
      elements,
      actualWidth,
      actualHeight,
    ], // Dependências
  );

  // --- Lógica de Agrupamento (Original) ---
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
        y: maxY + 1,
      };
      groupsWithLabels.push(group);
    }
    return groupsWithLabels;
  }, [elements]);
  // --- Fim da Lógica de Agrupamento ---

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
      {/* Loop de Renderização (Passando globalScale) */}
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

      {/* Lógica de "Cena Vazia" */}
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
