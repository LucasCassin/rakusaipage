import React from "react";
import Button from "components/ui/Button";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";
// --- NOVO IMPORT ---
import SceneDraggableItem from "./SceneDraggableItem";
// --- FIM DO NOVO IMPORT ---

/**
 * Renderiza a lista de Cenas (Roteiro) com controles de Edição
 * (Adicionar, Editar, Deletar, Reordenar).
 */
export default function SceneListEditor({
  scenes = [],
  currentSceneId,
  permissions,
  onSelectScene,
  onAddScene,
  onEditScene,
  onDeleteScene,
  reorderHandlers, // <-- 1. NOVA PROP (do 'usePE')
}) {
  return (
    <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-wrap items-center gap-2">
        {/* --- MUDANÇA: 'map' agora é envolvido pelo 'SceneDraggableItem' --- */}
        {scenes.map((scene, index) => (
          <SceneDraggableItem
            key={scene.id}
            id={scene.id}
            index={index}
            moveItem={reorderHandlers.moveScene}
            onDropItem={reorderHandlers.saveSceneOrder}
          >
            {/* O conteúdo (o botão com ações) é o 'children' */}
            <div
              className={`flex items-center rounded-full transition-all duration-200 ${
                currentSceneId === scene.id
                  ? "bg-rakusai-purple-light ring-2 ring-rakusai-purple"
                  : "bg-gray-100 ring-1 ring-gray-300"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectScene(scene.id)}
                className={`py-2 pl-4 pr-3 text-sm font-semibold rounded-l-full ${
                  currentSceneId === scene.id ? "text-white" : "text-gray-700"
                }`}
              >
                {`${scene.order + 1}. ${scene.name}`}
              </button>

              <span
                className={`h-4 w-px ${
                  currentSceneId === scene.id
                    ? "bg-rakusai-purple"
                    : "bg-gray-400"
                }`}
              ></span>

              <div className="flex items-center pr-2">
                {permissions.canUpdateScenes && (
                  <button
                    type="button"
                    onClick={() => onEditScene(scene)}
                    className={`p-1 rounded-full ${
                      currentSceneId === scene.id
                        ? "text-white hover:bg-white/20"
                        : "text-gray-500 hover:bg-gray-300"
                    }`}
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                )}
                {permissions.canDeleteScenes && (
                  <button
                    type="button"
                    onClick={() => onDeleteScene(scene)}
                    className={`p-1 rounded-full ${
                      currentSceneId === scene.id
                        ? "text-white hover:bg-white/20"
                        : "text-red-500 hover:bg-red-100"
                    }`}
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </SceneDraggableItem>
        ))}
        {/* --- FIM DA MUDANÇA --- */}

        {/* Botão Adicionar Cena */}
        {permissions.canCreateScenes && (
          <Button
            variant="secondary"
            size="small"
            className="!rounded-full"
            onClick={onAddScene}
          >
            <FiPlus />
          </Button>
        )}
      </div>
    </div>
  );
}
