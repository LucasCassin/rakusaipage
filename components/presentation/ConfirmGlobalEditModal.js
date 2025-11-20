import React, { useState } from "react";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import { FiX, FiAlertTriangle } from "react-icons/fi";

/**
 * Modal que pergunta se a edição de um elemento (nome/usuário)
 * deve ser local (só nesta cena) ou global (em todas as cenas).
 */
export default function ConfirmGlobalEditModal({
  modalData,
  error,
  onClose,
  onUpdateLocal,
  onUpdateGlobal,
}) {
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const isLoading = isLoadingLocal || isLoadingGlobal;

  const { oldData, newData } = modalData || {};

  const hasOldName = !!(
    oldData?.display_name && oldData.display_name.trim() !== ""
  );

  const handleLocal = async () => {
    setIsLoadingLocal(true);
    await onUpdateLocal();
    setIsLoadingLocal(false);
  };

  const handleGlobal = async () => {
    setIsLoadingGlobal(true);
    await onUpdateGlobal();
    setIsLoadingGlobal(false);
  };

  const changes = [];

  if (newData?.display_name !== oldData?.display_name) {
    changes.push(
      `Nome de "${oldData?.display_name || "Ninguém"}" para "${
        newData?.display_name || "Ninguém"
      }"`,
    );
  }

  const oldAssignees = (oldData?.assignees || []).slice().sort();
  const newAssignees = (newData?.assignees || []).slice().sort();

  if (JSON.stringify(oldAssignees) !== JSON.stringify(newAssignees)) {
    const countOld = oldAssignees.length;
    const countNew = newAssignees.length;
    changes.push(`Lista de Usuários (${countOld} -> ${countNew} associados)`);
  }

  const hasChanges = changes.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <FiAlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            Atualizar Elemento?
          </h3>
          <div className="mt-2 text-sm text-gray-500">
            <p className="mb-2">
              {hasOldName
                ? "Você alterou um elemento que pode estar sendo usado em outras cenas desta apresentação."
                : "Você alterou as propriedades deste elemento."}
            </p>
            <div className="text-left bg-gray-50 p-3 rounded border text-xs space-y-1">
              {hasChanges ? (
                <>
                  <strong>Mudanças identificadas:</strong>
                  {changes.map((change, i) => (
                    <span key={i} className="block">
                      • {change}
                    </span>
                  ))}
                </>
              ) : (
                <span className="block text-center italic text-gray-400">
                  Nenhuma alteração detectada.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-center font-medium text-gray-800">
            {hasOldName
              ? "Como você quer salvar esta alteração?"
              : "Confirmar alteração nesta cena?"}
          </p>
        </div>

        {error && (
          <Alert type="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div
          className={`grid gap-4 mt-6 ${
            hasOldName ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          <Button
            type="button"
            variant="primary"
            onClick={handleLocal}
            isLoading={isLoadingLocal}
            disabled={isLoading || !hasChanges}
            size="small"
            className="w-full"
          >
            {hasOldName ? "Salvar apenas nesta cena" : "Confirmar Alteração"}
          </Button>

          {hasOldName && (
            <Button
              type="button"
              variant="warning"
              onClick={handleGlobal}
              isLoading={isLoadingGlobal}
              disabled={isLoading || !hasChanges}
              size="small"
              className="w-full"
            >
              Salvar em TODAS as cenas
            </Button>
          )}
        </div>

        <div className="mt-4 text-center">
          <Button
            type="button"
            variant="link"
            onClick={onClose}
            disabled={isLoading}
            size="small"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
