import React, { useRef, useMemo, useState, useLayoutEffect } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import StageElement from "./StageElement";
import StageLine from "./StageLine";
import { settings } from "config/settings.js";

const VIRTUAL_WIDTH = 1000;
const BASE_ICON_SIZE_PX = settings.global.STAGE_MAP_SNAP.BASE_ICON_SIZE_PX;

const BASE_LABEL_MARGIN_PX = 3;

/**
 * (Componente interno) GroupLabel
 * ATUALIZADO (Bug 2): Recebe 'scale' individual para 'marginTop'.
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

  const baseIconHalfHeight = (BASE_ICON_SIZE_PX * scale * globalScale) / 2;
  const marginOffset = baseIconHalfHeight + BASE_LABEL_MARGIN_PX;

  return (
    <div
      className="absolute flex justify-center"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translateX(-50%) scale(${globalScale})`,
        transformOrigin: "top center",
        pointerEvents: "none",
        width: "150px",
        marginTop: `${marginOffset}px`,
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
 * REVISADO:
 * 1. Adiciona Snap às Linhas do Grid Estático (Feature Nova).
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

  const [dimensions, setDimensions] = useState({
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_WIDTH * (3 / 4),
  });
  const [snapGuides, setSnapGuides] = useState(null);
  const [snapAnchors, setSnapAnchors] = useState(null);

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

  function getSnappedPosition(
    newPosition,
    elementToIgnoreId = null,
    draggedItemScale = 1.0,
  ) {
    const { STAGE_MAP_SNAP } = settings.global;
    if (!STAGE_MAP_SNAP || actualWidth === 0 || actualHeight === 0) {
      return {
        snappedPosition: newPosition,
        guides: { x: null, y: null },
        anchors: { x: null, y: null },
      };
    }

    let snappedX = newPosition.x;
    let snappedY = newPosition.y;

    const snapXThreshold = STAGE_MAP_SNAP.SNAP_X_THRESHOLD;
    const snapYThreshold = STAGE_MAP_SNAP.SNAP_Y_THRESHOLD;

    let minXDiff = snapXThreshold;
    let minYDiff = snapYThreshold;

    let xGuide = null;
    let yGuide = null;
    let anchorXId = null;
    let anchorYId = null;

    const draggedScale = draggedItemScale || 1.0;

    const staticGridLines = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];

    for (const lineY of staticGridLines) {
      const yDiff = Math.abs(newPosition.y - lineY);
      if (yDiff < minYDiff) {
        minYDiff = yDiff;
        snappedY = lineY;
        yGuide = lineY;
        anchorYId = null;
      }
    }

    for (const lineX of staticGridLines) {
      const xDiff = Math.abs(newPosition.x - lineX);
      if (xDiff < minXDiff) {
        minXDiff = xDiff;
        snappedX = lineX;
        xGuide = lineX;
        anchorXId = null;
      }
    }

    const otherElements = elements.filter((el) => el.id !== elementToIgnoreId);

    for (const element of otherElements) {
      const elX = parseFloat(element.position_x);
      const elY = parseFloat(element.position_y);
      const targetScale = element.scale || 1.0;

      const newIconHalfWidthPercent =
        ((BASE_ICON_SIZE_PX * draggedScale * globalScale) /
          2 /
          dimensions.width) *
        100;
      const targetIconHalfWidthPercent =
        ((BASE_ICON_SIZE_PX * targetScale * globalScale) /
          2 /
          dimensions.width) *
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

      let yDiff = Math.abs(newPosition.y - elY);
      if (yDiff < minYDiff) {
        minYDiff = yDiff;
        snappedY = elY;
        yGuide = elY;
        anchorYId = element.id;
      }
      const targetBottom = elY + targetIconHalfHeightPercent;
      yDiff = Math.abs(
        newPosition.y - (targetBottom + newIconHalfHeightPercent),
      );
      if (yDiff < minYDiff) {
        minYDiff = yDiff;
        snappedY = targetBottom + newIconHalfHeightPercent;
        yGuide = null;
        anchorYId = element.id;
      }
      const targetTop = elY - targetIconHalfHeightPercent;
      yDiff = Math.abs(newPosition.y - (targetTop - newIconHalfHeightPercent));
      if (yDiff < minYDiff) {
        minYDiff = yDiff;
        snappedY = targetTop - newIconHalfHeightPercent;
        yGuide = null;
        anchorYId = element.id;
      }

      let xDiff = Math.abs(newPosition.x - elX);
      if (xDiff < minXDiff) {
        minXDiff = xDiff;
        snappedX = elX;
        xGuide = elX;
        anchorXId = element.id;
      }
      const targetRight = elX + targetIconHalfWidthPercent;
      xDiff = Math.abs(newPosition.x - (targetRight + newIconHalfWidthPercent));
      if (xDiff < minXDiff) {
        minXDiff = xDiff;
        snappedX = targetRight + newIconHalfWidthPercent;
        xGuide = null;
        anchorXId = element.id;
      }
      const targetLeft = elX - targetIconHalfWidthPercent;
      xDiff = Math.abs(newPosition.x - (targetLeft - newIconHalfWidthPercent));
      if (xDiff < minXDiff) {
        minXDiff = xDiff;
        snappedX = targetLeft - newIconHalfWidthPercent;
        xGuide = null;
        anchorXId = element.id;
      }
    }

    const epsilon = 0.0001;
    const didSnapX = Math.abs(snappedX - newPosition.x) > epsilon;
    const didSnapY = Math.abs(snappedY - newPosition.y) > epsilon;

    return {
      snappedPosition: { x: snappedX, y: snappedY },
      guides: {
        x: didSnapX && xGuide ? xGuide : null,
        y: didSnapY && yGuide ? yGuide : null,
      },
      anchors: {
        x: didSnapX ? anchorXId : null,
        y: didSnapY ? anchorYId : null,
      },
    };
  }

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
        setSnapAnchors(null);
        const { snappedPosition, guides, anchors } = getSnappedPosition(
          initialPosition,
          itemType === ItemTypes.STAGE_ELEMENT ? item.id : null,
          draggedItemScale,
        );
        if (anchors.x || anchors.y) {
          setSnapAnchors(anchors);
          setTimeout(() => setSnapAnchors(null), 1200);
        }
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
      let elementAtMaxY = null;

      for (const el of group.elements) {
        const elX = parseFloat(el.position_x);
        const elY = parseFloat(el.position_y);
        if (elX < minX) minX = elX;
        if (elX > maxX) maxX = elX;
        if (elY > maxY) {
          maxY = elY;
          elementAtMaxY = el;
        }
      }

      const scaleAtMaxY = elementAtMaxY?.scale || 1.0;
      group.labelPosition = {
        x: (minX + maxX) / 2,
        y: maxY,
        scale: scaleAtMaxY,
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
      {isEditorMode && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Linhas Verticais (X-axis) */}
          <div
            className="absolute top-0 bottom-0 border-l border-gray-300 border-dashed"
            style={{ left: "50%" }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-gray-200 border-dashed"
            style={{ left: "25%" }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-gray-200 border-dashed"
            style={{ left: "75%" }}
          />
          {/* Novas Linhas (Mais fracas) */}
          <div
            className="absolute top-0 bottom-0 border-l border-gray-100 border-dashed"
            style={{ left: "12.5%" }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-gray-100 border-dashed"
            style={{ left: "37.5%" }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-gray-100 border-dashed"
            style={{ left: "62.5%" }}
          />
          <div
            className="absolute top-0 bottom-0 border-l border-gray-100 border-dashed"
            style={{ left: "87.5%" }}
          />

          {/* Linhas Horizontais (Y-axis) */}
          <div
            className="absolute left-0 right-0 border-t border-gray-300 border-dashed"
            style={{ top: "50%" }}
          />
          <div
            className="absolute left-0 right-0 border-t border-gray-200 border-dashed"
            style={{ top: "25%" }}
          />
          <div
            className="absolute left-0 right-0 border-t border-gray-200 border-dashed"
            style={{ top: "75%" }}
          />
          {/* Novas Linhas (Mais fracas) */}
          <div
            className="absolute left-0 right-0 border-t border-gray-100 border-dashed"
            style={{ top: "12.5%" }}
          />
          <div
            className="absolute left-0 right-0 border-t border-gray-100 border-dashed"
            style={{ top: "37.5%" }}
          />
          <div
            className="absolute left-0 right-0 border-t border-gray-100 border-dashed"
            style={{ top: "62.5%" }}
          />
          <div
            className="absolute left-0 right-0 border-t border-gray-100 border-dashed"
            style={{ top: "87.5%" }}
          />
        </div>
      )}

      {/* Loop de Renderização (Passando globalScale e snapAnchors) */}
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
                snapAnchors={snapAnchors}
              />
            );
          })}

          {/* (Correção Bug 2) */}
          {group.display_name && group.labelPosition && (
            <GroupLabel
              label={group.display_name}
              x={group.labelPosition.x}
              y={group.labelPosition.y}
              scale={group.labelPosition.scale}
              isHighlighted={
                loggedInUser && group.assigned_user_id === loggedInUser.id
              }
              globalScale={globalScale}
            />
          )}
        </React.Fragment>
      ))}

      {/* --- (Feature 1: Guias Visuais Centrais) --- */}
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
      {/* --- FIM DA MUDANÇA --- */}

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
