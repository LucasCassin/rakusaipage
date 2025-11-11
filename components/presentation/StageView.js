import React from "react";
import FormationMap from "./FormationMap"; //
import TransitionChecklist from "./TransitionChecklist"; //

/**
 * Componente "controlador" que renderiza ou o Mapa de Palco (FORMATION)
 * ou a Checklist (TRANSITION), com base no tipo da cena.
 */
export default function StageView({
  scene,
  loggedInUser,
  isEditorMode,
  permissions,
  // Props do Mapa (Formação)
  onPaletteDrop,
  onElementMove,
  onElementClick,
  onElementDelete,
  onElementMerge, // <-- 1. ADICIONAR NOVA PROP AQUI
  // Props da Checklist (Transição)
  onAddStep,
  onEditStep,
  onDeleteStep,
}) {
  // Estado de segurança caso 'scene' ainda não esteja carregada
  if (!scene) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-gray-100 rounded-lg shadow-inner">
        <p className="text-gray-500">Selecione uma cena para começar.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white rounded-lg shadow-lg border border-gray-200 min-h-[500px] overflow-hidden">
      {scene.scene_type === "FORMATION" && (
        <FormationMap
          elements={scene.scene_elements}
          loggedInUser={loggedInUser}
          isEditorMode={isEditorMode}
          onPaletteDrop={onPaletteDrop}
          onElementMove={onElementMove}
          onElementClick={onElementClick}
          onElementDelete={onElementDelete}
          onElementMerge={onElementMerge} // <-- 2. PASSAR A PROP PARA O MAPA
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
