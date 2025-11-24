import React from "react";
import Button from "components/ui/Button";

/**
 * Renderiza a lista de Cenas (o "Roteiro") como uma barra de navegação.
 *
 */
export default function SceneSelector({
  scenes = [],
  currentSceneId,
  onSelectScene,
}) {
  if (!scenes || scenes.length === 0) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500">
        Esta apresentação ainda não tem cenas.
      </div>
    );
  }

  return (
    <div className="bg-white p-3 rounded-lg shadow-md border border-gray-200">
      <nav className="flex flex-wrap items-center gap-2">
        {scenes.map((scene) => (
          <Button
            key={scene.id}
            variant={currentSceneId === scene.id ? "primary" : "secondary"}
            size="small"
            onClick={() => onSelectScene(scene.id)}
            className="font-semibold !text-sm"
          >
            {/* O 'order' já vem do findDeepById */}
            {`${scene.order + 1}. ${scene.name}`}
          </Button>
        ))}
      </nav>
    </div>
  );
}
