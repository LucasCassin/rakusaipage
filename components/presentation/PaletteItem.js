import React, { useRef } from "react";
import Image from "next/image";
import { useDrag } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import { useViewportSize } from "src/hooks/useViewportSize";

export default function PaletteItem({
  itemData,
  onManualAdd,
  onTogglePalette,
}) {
  const {
    name,
    iconUrl,
    element_type_id,
    display_name,
    assignees,
    isTemplate,
    scale,
    image_url_highlight,
    element_type_name,
  } = itemData;

  const { width } = useViewportSize();
  const isMobile = width < 768;

  const lastClickTimeRef = useRef(0);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: ItemTypes.PALETTE_ITEM,
      canDrag: !isMobile,
      item: {
        type: ItemTypes.PALETTE_ITEM,
        element_type_id,
        display_name,
        assignees,
        image_url: iconUrl,
        element_type_name: element_type_name,
        scale: scale,
        image_url_highlight: image_url_highlight,
        isTemplate,
      },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    [isMobile],
  );

  const handleMobileClick = (e) => {
    if (!isMobile) return;

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    if (timeSinceLastClick > 0 && timeSinceLastClick < 300) {
      e.preventDefault();

      if (onManualAdd) {
        onManualAdd(itemData);
        onTogglePalette();
      }

      lastClickTimeRef.current = 0;
    } else {
      lastClickTimeRef.current = now;
    }
  };

  return (
    <div
      ref={isMobile ? null : drag}
      onClick={handleMobileClick}
      className={`flex items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-300 shadow-sm ${
        isDragging ? "opacity-50" : "opacity-100"
      } ${isMobile ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
      style={
        isMobile
          ? {
              userSelect: "none",

              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }
          : { touchAction: "none" }
      }
    >
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-inner overflow-hidden pointer-events-none">
        <Image
          src={iconUrl || "/favicon.svg"}
          alt={name}
          width={28}
          height={28}
          className="object-contain"
          style={{ transform: `scale(${scale || 1.0})` }}
        />
      </div>
      <span className="ml-3 font-medium text-sm text-gray-700 pointer-events-none">
        {name}
      </span>
    </div>
  );
}
