import React, { useRef, useMemo, useState, useLayoutEffect } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import StageElement from "./StageElement";
import StageLine from "./StageLine";
import { settings } from "config/settings.js"; // Importa as configs

const VIRTUAL_WIDTH = 1000;
const BASE_ICON_SIZE_PX = settings.global.STAGE_MAP_SNAP.BASE_ICON_SIZE_PX;
const BASE_LABEL_MARGIN_PX = 3;

/**
 * (Componente interno) GroupLabel
 * ATUALIZADO:
 * 1. Recebe 'scale' (individual) para o marginTop.
 * 2. Corrige o 'transform' (remove * 1.5).
 */
const GroupLabel = ({
  label,
  x,
  y,
  isHighlighted,
  globalScale = 1.0,
  scale = 1.0,
}) => {
  if (!label) return null;

  const highlightClasses = isHighlighted
    ? "bg-rakusai-pink"
    : "bg-gray-800 bg-opacity-80";

  // --- (Correção do Bug do Label) ---
  const baseIconHalfHeight = (BASE_ICON_SIZE_PX * scale * globalScale) / 2;
  const marginOffset = baseIconHalfHeight + BASE_LABEL_MARGIN_PX;
  // --- FIM DA CORREÇÃO ---

  return (
    <div
      className="absolute flex justify-center"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translateX(-50%) scale(${globalScale})`, // (Correção: * 1.5 removido)
        transformOrigin: "top center",
        pointerEvents: "none",
        width: "150px",
        marginTop: `${marginOffset}px`, // (Correção: marginTop dinâmico)
      }}
    >
      <span
        className={`px-2 py-0.5 rounded-md text-xs font-semibold text-white shadow text-center ${highlightClasses}`}
      >
        {label}
      </span>
    </div>
  );
};

/**
 * Renderiza o "Palco".
 * (Lógica de Snap e Escala)
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

  // --- Lógica de Escala Global ---
  const [dimensions, setDimensions] = useState({
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_WIDTH * (3 / 4),
  });
  const [snapGuides, setSnapGuides] = useState(null); // { x: number|null, y: number|null }

  useLayoutEffect(() => {
    const element = mapRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setDimensions({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    resizeObserver.observe(element);

    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: rect.width, height: rect.height });
    }

    return () => resizeObserver.unobserve(element);
  }, []);

  const globalScale = dimensions.width / VIRTUAL_WIDTH;
  const actualWidth = dimensions.width;
  const actualHeight = dimensions.height;
  // --- Fim da Lógica de Escala ---

  // --- Lógica de Alinhamento (Snap) ---
  function getSnappedPosition(
    newPosition,
    elementToIgnoreId = null,
    draggedItemScale = 1.0,
  ) {
    let xGuide = null;
    let yGuide = null;

    const { STAGE_MAP_SNAP } = settings.global;
    if (
      !STAGE_MAP_SNAP ||
      !elements ||
      elements.length === 0 ||
      actualWidth === 0 ||
      actualHeight === 0
    ) {
      return { snappedPosition: newPosition, guides: { x: null, y: null } };
    }

    const otherElements = elements.filter((el) => el.id !== elementToIgnoreId);

    if (otherElements.length === 0) {
      return { snappedPosition: newPosition, guides: { x: null, y: null } };
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
      return { snappedPosition: newPosition, guides: { x: null, y: null } };
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

    // Calcular Meias-Dimensões (Usando a fórmula validada)
    const newIconHalfWidthPercent =
      ((BASE_ICON_SIZE_PX * draggedScale * globalScale) /
        2 /
        dimensions.width) *
      100;
    const targetIconHalfWidthPercent =
      ((BASE_ICON_SIZE_PX * targetScale * globalScale) / 2 / dimensions.width) *
      100;
    const newIconHalfHeightPercent =
      ((BASE_ICON_SIZE_PX * draggedScale * globalScale) /
        2 /
        dimensions.height) *
      100;
    const targetIconHalfHeightPercent =
      ((BASE_ICON_SIZE_PX * targetScale * globalScale) /
        2 /
        dimensions.height) *
      100;

    // A. LÓGICA Y (Centro a Centro)
    const yDiff = Math.abs(newPosition.y - elY);
    if (yDiff < snapYThreshold) {
      snappedY = elY;
      yGuide = elY;
    }

    // B. LÓGICA X (Centro a Centro)
    const xDiff = Math.abs(newPosition.x - elX);
    if (xDiff < snapXThreshold) {
      snappedX = elX;
      xGuide = elX;
    }

    // C. LÓGICA X (Lado a Lado - Borda a Borda)
    const targetRight = elX + targetIconHalfWidthPercent;
    const xDiffRight = Math.abs(
      newPosition.x - (targetRight + newIconHalfWidthPercent),
    );
    if (xDiffRight < snapXThreshold) {
      snappedX = targetRight + newIconHalfWidthPercent;
      xGuide = snappedX;
    }

    const targetLeft = elX - targetIconHalfWidthPercent;
    const xDiffLeft = Math.abs(
      newPosition.x - (targetLeft - newIconHalfWidthPercent),
    );
    if (xDiffLeft < snapXThreshold) {
      snappedX = targetLeft - newIconHalfWidthPercent;
      xGuide = snappedX;
    }

    // D. LÓGICA Y (Empilhamento - Borda a Borda)
    const targetBottom = elY + targetIconHalfHeightPercent;
    const yDiffBottom = Math.abs(
      newPosition.y - (targetBottom + newIconHalfHeightPercent),
    );
    if (yDiffBottom < snapYThreshold) {
      snappedY = targetBottom + newIconHalfHeightPercent;
      yGuide = snappedY;
    }

    const targetTop = elY - targetIconHalfHeightPercent;
    const yDiffTop = Math.abs(
      newPosition.y - (targetTop - newIconHalfHeightPercent),
    );
    if (yDiffTop < snapYThreshold) {
      snappedY = targetTop - newIconHalfHeightPercent;
      yGuide = snappedY;
    }

    return {
      snappedPosition: { x: snappedX, y: snappedY },
      guides: { x: xGuide, y: yGuide },
    };
  }
  // --- Fim da Lógica de Alinhamento ---

  // --- Lógica de Drop (Atualizada com Guias Visuais) ---
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
        let draggedItemScale = 1.0;

        if (itemType === ItemTypes.PALETTE_ITEM) {
          draggedItemScale = item.scale || 1.0;
        } else if (itemType === ItemTypes.STAGE_ELEMENT) {
          draggedItemScale = item.scale || 1.0;
        }

        setSnapGuides(null);

        const { snappedPosition, guides } = getSnappedPosition(
          initialPosition,
          itemType === ItemTypes.STAGE_ELEMENT ? item.id : null,
          draggedItemScale,
        );

        if (guides.x !== null || guides.y !== null) {
          setSnapGuides(guides);
          setTimeout(() => setSnapGuides(null), 1200);
        }

        if (itemType === ItemTypes.PALETTE_ITEM && onPaletteDrop) {
          onPaletteDrop(item, snappedPosition);
        } else if (itemType === ItemTypes.STAGE_ELEMENT && onElementMove) {
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
    ],
  );

  // --- LÓGICA DE AGRUPAMENTO E LABELS - ATUALIZADA (Bug do Label) ---
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
        maxX = 0;
      let maxY = 0;
      let elementAtMaxY = null; // (Correção Bug do Label)

      for (const el of group.elements) {
        const elX = parseFloat(el.position_x);
        const elY = parseFloat(el.position_y);
        if (elX < minX) minX = elX;
        if (elX > maxX) maxX = elX;

        if (elY > maxY) {
          // (Correção Bug do Label)
          maxY = elY;
          elementAtMaxY = el;
        }
      }

      const scaleAtMaxY = elementAtMaxY?.scale || 1.0; // (Correção Bug do Label)
      group.labelPosition = {
        x: (minX + maxX) / 2,
        y: maxY,
        scale: scaleAtMaxY, // (Correção Bug do Label)
      };
      groupsWithLabels.push(group);
    }
    return groupsWithLabels;
  }, [elements]);
  // --- (FIM DA LÓGICA ATUALIZADA) ---

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
              scale={group.labelPosition.scale} // (Correção Bug do Label)
              isHighlighted={
                loggedInUser && group.assigned_user_id === loggedInUser.id
              }
              globalScale={globalScale}
            />
          )}
        </React.Fragment>
      ))}

      {/* --- INÍCIO DA CORREÇÃO (Feature 1 - Guia Visual) --- */}
      {/* Verifica se 'snapGuides' existe (não é nulo) ANTES 
        de tentar acessar 'snapGuides.y' ou 'snapGuides.x'.
      */}
      {snapGuides && snapGuides.y !== null && (
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-rakusai-pink pointer-events-none"
          style={{ top: `${snapGuides.y}%` }}
        />
      )}
      {snapGuides && snapGuides.x !== null && (
        <div
          className="absolute top-0 bottom-0 border-l-2 border-dashed border-rakusai-pink pointer-events-none"
          style={{ left: `${snapGuides.x}%` }}
        />
      )}
      {/* --- FIM DA CORREÇÃO --- */}

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
