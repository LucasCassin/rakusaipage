import React, { useRef, useMemo } from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./ItemTypes";
import StageElement from "./StageElement";
import StageLine from "./StageLine";

/**
 * (NOVO) Componente interno para renderizar o nome do grupo.
 * ATUALIZADO: Recebe 'isHighlighted' para mudar a cor.
 */
const GroupLabel = ({ label, x, y, isHighlighted }) => {
  // 1. Receber 'isHighlighted'
  if (!label) return null;

  // --- CORREÇÃO (Bug 2) ---
  const highlightClasses = isHighlighted
    ? "bg-rakusai-pink" // Destaque rosa
    : "bg-gray-800 bg-opacity-80"; // Padrão
  // --- FIM DA CORREÇÃO ---

  return (
    <div
      className="absolute flex justify-center"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translateX(-50%)",
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
  loggedInUser, // 2. Precisamos do 'loggedInUser'
  onPaletteDrop,
  onElementMove,
  onElementClick,
  onElementDelete,
  onElementMerge,
  isEditorMode,
}) {
  const mapRef = useRef(null);

  // --- (Lógica de Drop do Mapa - Sem Alterações) ---
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

  // --- (LÓGICA DE AGRUPAMENTO E LABELS - ATUALIZADA) ---
  const processedGroups = useMemo(() => {
    const groups = new Map();

    // 1. Agrupar elementos por group_id
    for (const element of elements) {
      if (!groups.has(element.group_id)) {
        groups.set(element.group_id, {
          group_id: element.group_id,
          display_name: element.display_name,
          // --- CORREÇÃO (Bug 2): Capturar o ID do usuário do grupo ---
          assigned_user_id: element.assigned_user_id,
          // --- FIM DA CORREÇÃO ---
          elements: [],
        });
      }
      groups.get(element.group_id).elements.push(element);
    }

    // 2. Calcular posições dos labels para cada grupo
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
        // --- CORREÇÃO (Bug 1): Garantir que são NÚMEROS ---
        const elX = parseFloat(el.position_x);
        const elY = parseFloat(el.position_y);
        // --- FIM DA CORREÇÃO ---

        if (elX < minX) minX = elX;
        if (elX > maxX) maxX = elX;
        if (elY > maxY) maxY = elY;
      }

      group.labelPosition = {
        x: (minX + maxX) / 2, // Centro X (agora funciona)
        y: maxY, // Y mais baixo
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
      className={`relative w-full min-h-[500px] h-full
        bg-white
        border border-gray-300
        shadow-inner
        rounded-b-lg overflow-hidden p-4
        ${isEditorMode ? "cursor-move" : ""}
        ${isOver ? "ring-4 ring-rakusai-pink-light ring-inset" : ""} 
      `}
    >
      {/* --- 3. (LOOP MODIFICADO) --- */}
      {processedGroups.map((group) => (
        <React.Fragment key={group.group_id}>
          {/* 1. Renderiza todos os elementos (ícones) do grupo */}
          {group.elements.map((element) => {
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

            return (
              <StageElement
                key={element.id}
                element={element}
                loggedInUser={loggedInUser}
                isEditorMode={isEditorMode}
                onClick={onElementClick}
                onElementMerge={onElementMerge}
              />
            );
          })}

          {/* 2. Renderiza o Label do Grupo (se houver nome e posição) */}
          {group.display_name && group.labelPosition && (
            <GroupLabel
              label={group.display_name}
              x={group.labelPosition.x}
              y={group.labelPosition.y}
              // --- CORREÇÃO (Bug 2): Passar dados de destaque ---
              isHighlighted={
                loggedInUser && group.assigned_user_id === loggedInUser.id
              }
              // --- FIM DA CORREÇÃO ---
            />
          )}
        </React.Fragment>
      ))}
      {/* --- (FIM DO LOOP MODIFICADO) --- */}

      {/* Lógica de "Cena Vazia" (permanece a mesma) */}
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
