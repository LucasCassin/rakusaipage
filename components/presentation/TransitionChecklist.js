import React from "react";
import TransitionStepItem from "./TransitionStepItem";

/**
 * Renderiza a "Lista de Tarefas" (checklist) para cenas do tipo TRANSITION.
 *
 */
export default function TransitionChecklist({ steps = [], loggedInUser }) {
  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-gray-50 p-4">
        <p className="text-gray-500">Esta cena (transição) não tem passos.</p>
      </div>
    );
  }

  // O 'findDeepById' já deve nos dar os steps ordenados.
  return (
    <div className="divide-y divide-gray-200">
      {steps.map((step) => (
        <TransitionStepItem
          key={step.id}
          step={step}
          loggedInUser={loggedInUser}
        />
      ))}
    </div>
  );
}
