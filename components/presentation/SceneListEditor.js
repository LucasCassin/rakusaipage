import React from "react";
import Button from "components/ui/Button";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";

/**
 * Renderiza a lista de Cenas (Roteiro) com controles de Edição
 * (Adicionar, Editar, Deletar).
 */
export default function SceneListEditor({
  scenes = [],
  currentSceneId,
  permissions,
  onSelectScene,
  onAddScene, // (chama modal.openSceneForm('create'))
  onEditScene, // (chama modal.openSceneForm('edit', scene))
  onDeleteScene, // (chama modal.openDeleteScene(scene))
}) {
  return (
    <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-wrap items-center gap-2">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className={`flex items-center rounded-full transition-all duration-200 ${
              currentSceneId === scene.id
                ? "bg-rakusai-purple-light ring-2 ring-rakusai-purple"
                : "bg-gray-100 ring-1 ring-gray-300"
            }`}
          >
            {/* Botão de Seleção Principal */}
            <button
              type="button"
              onClick={() => onSelectScene(scene.id)}
              className={`py-2 pl-4 pr-3 text-sm font-semibold rounded-l-full ${
                currentSceneId === scene.id ? "text-white" : "text-gray-700"
              }`}
            >
              {`${scene.order + 1}. ${scene.name}`}
            </button>

            {/* Divisor */}
            <span
              className={`h-4 w-px ${
                currentSceneId === scene.id
                  ? "bg-rakusai-purple"
                  : "bg-gray-400"
              }`}
            ></span>

            {/* Botões de Ação */}
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
        ))}

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
