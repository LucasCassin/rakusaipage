import React from "react";
import Image from "next/image";
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import { settings } from "config/settings.js";

/**
 * Renderiza um único elemento (ícone) no mapa de palco.
 * 1. Não renderiza mais o 'display_name'. (Isso agora é feito pelo FormationMap)
 * 2. É um 'useDrag' (para mover).
 * 3. É um 'useDrop' (para fundir/agrupar).
 */
export default function StageElement({
  element,
  loggedInUser,
  isEditorMode,
  onClick,
  onElementMerge,
  globalScale,
  snapAnchors,
}) {
  const isHighlighted =
    loggedInUser &&
    element.assignees &&
    Array.isArray(element.assignees) &&
    element.assignees.includes(loggedInUser.id);

  const iconUrl =
    isHighlighted && element.image_url_highlight
      ? element.image_url_highlight
      : element.image_url || "/favicon.svg";

  const individualScale = element.scale || 1.0;
  const finalScale = individualScale * globalScale;
  const baseIconSize = settings.global.STAGE_MAP_SNAP.BASE_ICON_SIZE_PX;

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.STAGE_ELEMENT,
      item: {
        type: ItemTypes.STAGE_ELEMENT,
        id: element.id,
        group_id: element.group_id,
        x: element.position_x,
        y: element.position_y,
        scale: element.scale || 1.0,
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
      element.scale,
    ],
  );

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ItemTypes.STAGE_ELEMENT,
      drop: (droppedItem, _) => {
        if (onElementMerge && element.id !== droppedItem.id) {
          onElementMerge(element, droppedItem);
        }
      },
      canDrop: (droppedItem) => isEditorMode && element.id !== droppedItem.id,
      collect: (monitor) => ({
        isOver:
          isEditorMode &&
          monitor.canDrop() &&
          !!monitor.isOver({ shallow: true }),
      }),
    }),
    [isEditorMode, onElementMerge, element],
  );

  const handleClick = (e) => {
    if (isDragging) {
      e.preventDefault();
      return;
    }
    if (isEditorMode && onClick) {
      onClick(element);
    }
  };

  const isSnapAnchor =
    snapAnchors?.x === element.id || snapAnchors?.y === element.id;

  const mergeHoverClasses =
    isOver && !isDragging
      ? "ring-8 ring-rakusai-purple ring-inset animate-pulse"
      : "";

  return (
    <div
      ref={(node) => drag(drop(node))}
      onClick={handleClick}
      // 3. APLICAR CLASSE DE DESTAQUE
      className={`absolute flex flex-col items-center
        ${isEditorMode ? "cursor-move" : ""}
        ${isDragging ? "opacity-30" : "opacity-100"}
        ${
          isEditorMode && !isDragging
            ? "hover:scale-110 transition-transform hover:cursor-pointer"
            : ""
        } 
        ${mergeHoverClasses}
        ${
          isSnapAnchor // (A lógica de destaque que implementamos)
            ? "ring-4 ring-rakusai-pink-light ring-inset animate-pulse"
            : ""
        } 
      `}
      style={{
        left: `${element.position_x}%`,
        top: `${element.position_y}%`,
        transform: `translate(-50%, -50%) scale(${finalScale})`,
        width: `${baseIconSize}px`,
        height: `${baseIconSize}px`,
      }}
    >
      <div
        className={`relative flex items-center justify-center w-full h-full`}
      >
        <Image
          src={iconUrl}
          alt={element.element_type_name || ""}
          fill={true}
          className={`object-contain transition-all duration-300`}
        />
      </div>
    </div>
  );
}
