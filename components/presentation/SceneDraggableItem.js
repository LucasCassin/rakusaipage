import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes"; //

/**
 * "Wrapper" que torna qualquer componente filho (neste caso,
 * o botão da cena) arrastável e um alvo para reordenar.
 */
export default function SceneDraggableItem({
  id,
  index,
  moveItem, // (Função otimista do 'usePE')
  onDropItem, // (Função de API do 'usePE' - 'saveSceneOrder')
  children,
}) {
  const ref = useRef(null);

  // --- Lógica do Alvo (Drop) ---
  const [, drop] = useDrop({
    accept: ItemTypes.SCENE_ITEM,
    hover(item, monitor) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return; // Não faz nada se for o mesmo item

      // Lógica para determinar a hora de mover
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleX =
        (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientX = clientOffset.x - hoverBoundingRect.left;

      // Arrastando para a esquerda
      if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) return;
      // Arrastando para a direita
      if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) return;

      // Hora de mover!
      moveItem(dragIndex, hoverIndex);
      // Atualiza o índice do item arrastado
      item.index = hoverIndex;
    },
    // Chamado quando o item é *solto*
    drop: () => {
      onDropItem(); // Chama a API para salvar a nova ordem
    },
  });

  // --- Lógica de Arrastar (Drag) ---
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SCENE_ITEM,
    item: { id, index }, // O payload
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Anexa os refs de 'drag' e 'drop' ao nó
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
