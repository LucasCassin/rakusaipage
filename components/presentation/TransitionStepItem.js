import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import { FiEdit2, FiTrash2, FiAlertCircle } from "react-icons/fi";

/**
 * Renderiza um único item da "checklist" de transição.
 * Contém a lógica de "Destaque" e os botões de Edição.
 */
export default function TransitionStepItem({
  step,
  loggedInUser,
  isEditorMode,
  permissions,
  onEdit,
  onDelete,
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (!pendingAction) return;
    const timer = setTimeout(() => setPendingAction(null), 3000);
    return () => clearTimeout(timer);
  }, [pendingAction]);

  const isHighlighted =
    loggedInUser &&
    step.assignees &&
    Array.isArray(step.assignees) &&
    step.assignees.includes(loggedInUser.id);

  const highlightClasses = isHighlighted
    ? "bg-rakusai-pink-light bg-opacity-20 border-l-4 !border-rakusai-pink"
    : "bg-white";

  const hasNoAssignees = !step.assignees || step.assignees.length === 0;
  const showWarning = isEditorMode && hasNoAssignees;

  const handleDelete = async () => {
    if (pendingAction !== "delete") {
      setPendingAction("delete");
      return;
    }
    setIsProcessing(true);
    await onDelete(step.id);
  };

  return (
    <div
      className={`flex items-start p-4 space-x-3 ${highlightClasses} transition-colors duration-300`}
    >
      <span className="flex items-center justify-center w-6 h-6 font-bold text-gray-500 bg-gray-100 rounded-full flex-shrink-0">
        {step.order + 1}
      </span>

      <div className="flex-1">
        <p className="text-gray-800">{step.description}</p>
        {isHighlighted && (
          <span className="text-xs font-semibold text-rakusai-pink">
            (Sua responsabilidade)
          </span>
        )}
        {showWarning && !isHighlighted && (
          <span className="text-xs font-semibold text-amber-500 animate-pulse print:hidden">
            (Sem responsável)
          </span>
        )}
      </div>

      {isEditorMode && (
        <div className="flex items-center gap-2">
          {permissions.canUpdateStep && (
            <Button
              variant="secondary"
              size="small"
              onClick={() => onEdit(step)}
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
    </div>
  );
}
