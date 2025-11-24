import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";

/**
 * "Wrapper" que torna qualquer componente filho (neste caso,
 * o botão da cena) arrastável e um alvo para reordenar.
 */
export default function SceneDraggableItem({
  id,
  index,
  moveItem,
  onDropItem,
  children,
}) {
  const ref = useRef(null);

  const [, drop] = useDrop({
    accept: ItemTypes.SCENE_ITEM,
    hover(item, monitor) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;

      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

      moveItem(dragIndex, hoverIndex);

      item.index = hoverIndex;
    },

    drop: () => {
      onDropItem();
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SCENE_ITEM,
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="cursor-move"
    >
      {children}
    </div>
  );
}
