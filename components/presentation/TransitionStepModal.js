import React, { useState, useEffect } from "react";
import Button from "components/ui/Button"; //
import { FiCheck, FiEdit2, FiTrash2 } from "react-icons/fi";

/**
 * Renderiza um único item da "checklist" de transição.
 * Contém a lógica de "Destaque".
 * AGORA também tem botões de edição.
 */
export default function TransitionStepItem({
  step,
  loggedInUser,
  isEditorMode, // <-- NOVA PROP
  permissions, // <-- NOVA PROP
  onEdit, // <-- NOVA PROP (chama modal.openStep)
  onDelete, // <-- NOVA PROP (chama stepHandlers.deleteStep)
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'delete'

  // Reseta o botão "Certeza?" após 3 segundos
  useEffect(() => {
    if (!pendingAction) return;
    const timer = setTimeout(() => setPendingAction(null), 3000);
    return () => clearTimeout(timer);
  }, [pendingAction]);

  // A "Mágica do Destaque"
  const isHighlighted =
    loggedInUser && step.assigned_user_id === loggedInUser.id;

  const highlightClasses = isHighlighted
    ? "bg-rakusai-pink-light bg-opacity-20 border-l-4 border-rakusai-pink"
    : "bg-white";

  const handleDelete = async () => {
    if (pendingAction !== "delete") {
      setPendingAction("delete");
      return;
    }
    setIsProcessing(true);
    await onDelete(step.id);
    // Não precisa resetar o estado, o componente será re-renderizado
  };

  return (
    <div
      className={`flex items-start p-4 space-x-3 ${highlightClasses} transition-colors duration-300`}
    >
      {/* O Número da Ordem */}
      <span className="flex items-center justify-center w-6 h-6 font-bold text-gray-500 bg-gray-100 rounded-full flex-shrink-0">
        {step.order + 1}
      </span>

      {/* A Descrição */}
      <div className="flex-1">
        <p className="text-gray-800">{step.description}</p>
        {isHighlighted && (
          <span className="text-xs font-semibold text-rakusai-pink">
            (Sua responsabilidade)
          </span>
        )}
      </div>

      {/* --- MUDANÇA: Botões do Modo Editor --- */}
      {isEditorMode && (
        <div className="flex items-center gap-2">
          {permissions.canUpdateStep && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => onEdit(step)} // Chama modal.openStep('edit', step)
              disabled={isProcessing}
            >
              <FiEdit2 />
            </Button>
          )}
          {permissions.canDeleteStep && (
            <Button
              variant={pendingAction === "delete" ? "warning" : "danger"}
              size="small"
              onClick={handleDelete}
              isLoading={isProcessing}
              disabled={isProcessing}
            >
              {pendingAction === "delete" ? "Certeza?" : <FiTrash2 />}
            </Button>
          )}
        </div>
      )}
      {/* --- FIM DA MUDANÇA --- */}
    </div>
  );
}
