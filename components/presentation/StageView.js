import React from "react";
import FormationMap from "./FormationMap";
import TransitionChecklist from "./TransitionChecklist";

/**
 * Componente "controlador" que renderiza ou o Mapa de Palco (FORMATION)
 * ou a Checklist (TRANSITION), com base no tipo da cena.
 */
export default function StageView({
  scene,
  loggedInUser,
  isEditorMode,
  permissions,

  onPaletteDrop,
  onElementMove,
  onElementClick,
  onElementDelete,
  onElementMerge,

  onAddStep,
  onEditStep,
  onDeleteStep,
}) {
  if (!scene) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-gray-100 rounded-lg shadow-inner">
        <p className="text-gray-500">Selecione uma cena para começar.</p>
      </div>
    );
  }

  const containerClasses =
    scene.scene_type === "FORMATION" ? "aspect-[4/3]" : "min-h-[500px]";

  return (
    <div
      className={`mt-4 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden ${containerClasses}`}
    >
      {scene.scene_type === "FORMATION" && (
        <FormationMap
          elements={scene.scene_elements}
          loggedInUser={loggedInUser}
          isEditorMode={isEditorMode}
          onPaletteDrop={onPaletteDrop}
          onElementMove={onElementMove}
          onElementClick={onElementClick}
          onElementDelete={onElementDelete}
          onElementMerge={onElementMerge}
        />
      )}

      {scene.scene_type === "TRANSITION" && (
        <TransitionChecklist
          steps={scene.transition_steps}
          loggedInUser={loggedInUser}
          isEditorMode={isEditorMode}
          permissions={permissions}
          onAddStep={onAddStep}
          onEditStep={onEditStep}
          onDeleteStep={onDeleteStep}
        />
      )}
    </div>
  );
}
