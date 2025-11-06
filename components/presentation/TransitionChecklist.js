import React from "react";
import Button from "components/ui/Button"; //
import TransitionStepItem from "./TransitionStepItem";
import { FiPlus } from "react-icons/fi";

/**
 * Renderiza a "Lista de Tarefas" (checklist) para cenas do tipo TRANSITION.
 * AGORA inclui botões de edição no Modo Editor.
 */
export default function TransitionChecklist({
  steps = [],
  loggedInUser,
  isEditorMode, // <-- NOVA PROP
  permissions, // <-- NOVA PROP
  onAddStep, // <-- NOVA PROP (chama modal.openStep('create'))
  onEditStep, // <-- NOVA PROP
  onDeleteStep, // <-- NOVA PROP
}) {
  const canAdd = isEditorMode && permissions.canCreateStep;

  return (
    <div className="divide-y divide-gray-200">
      {/* --- MUDANÇA: Botão de Adicionar --- */}
      {canAdd && (
        <div className="p-4">
          <Button
            variant="primary"
            size="small"
            onClick={() => onAddStep()} // Chama modal.openStep('create')
          >
            <FiPlus className="mr-2" />
            Adicionar Passo
          </Button>
        </div>
      )}
      {/* --- FIM DA MUDANÇA --- */}

      {steps.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px] bg-gray-50 p-4">
          <p className="text-gray-500">
            {isEditorMode ? "Use o botão acima para" : "Esta cena (transição)"}
            {isEditorMode ? " adicionar o primeiro passo." : " não tem passos."}
          </p>
        </div>
      ) : (
        steps.map((step) => (
          <TransitionStepItem
            key={step.id}
            step={step}
            loggedInUser={loggedInUser}
            isEditorMode={isEditorMode} // <-- PASSAR PROP
            permissions={permissions} // <-- PASSAR PROP
            onEdit={onEditStep} // <-- PASSAR PROP
            onDelete={onDeleteStep} // <-- PASSAR PROP
          />
        ))
      )}
    </div>
  );
}
