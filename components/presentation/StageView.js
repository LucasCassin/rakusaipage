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
  permissions, // <-- 1. NOVA PROP
  // Props do Mapa (Formação)
  onPaletteDrop,
  onElementMove,
  onElementClick,
  onElementDelete,
  // Props da Checklist (Transição)
  onAddStep, // <-- 2. NOVA PROP (chama modal.openStep)
  onEditStep, // <-- 3. NOVA PROP (chama modal.openStep)
  onDeleteStep, // <-- 4. NOVA PROP (chama stepHandlers.deleteStep)
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
          // (permissions não é necessário no mapa, pois os handlers já vêm do hook)
        />
      )}

      {scene.scene_type === "TRANSITION" && (
        <TransitionChecklist
          steps={scene.transition_steps}
          loggedInUser={loggedInUser}
          isEditorMode={isEditorMode} // <-- PASSAR PROP
          permissions={permissions} // <-- PASSAR PROP
          onAddStep={onAddStep} // <-- PASSAR PROP
          onEditStep={onEditStep} // <-- PASSAR PROP
          onDeleteStep={onDeleteStep} // <-- PASSAR PROP
        />
      )}
    </div>
  );
}
