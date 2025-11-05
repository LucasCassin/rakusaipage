import React from "react";
import FormationMap from "./FormationMap"; //
import TransitionChecklist from "./TransitionChecklist"; //

/**
 * Componente "controlador" que renderiza ou o Mapa de Palco (FORMATION)
 * ou a Checklist (TRANSITION), com base no tipo da cena.
 */
export default function StageView({ scene, loggedInUser }) {
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
      {/* Aqui está o "switch" de renderização.
        O 'loggedInUser' é passado para ambos os componentes 
        para a "Mágica do Destaque"
      */}

      {scene.scene_type === "FORMATION" && (
        <FormationMap
          elements={scene.scene_elements}
          loggedInUser={loggedInUser}
        />
      )}

      {scene.scene_type === "TRANSITION" && (
        <TransitionChecklist
          steps={scene.transition_steps}
          loggedInUser={loggedInUser}
        />
      )}
    </div>
  );
}
