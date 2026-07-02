import React, { useEffect, useState } from "react";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import FormInput from "components/forms/FormInput";
import { FiX, FiAlertTriangle } from "react-icons/fi";

const KEYWORD = "EXCLUIR";

/**
 * Modal de confirmação para exclusão definitiva de itens do PDV (produto,
 * forma de pagamento, variante). Verifica em tempo real, via `checkUsage`,
 * se o item já foi usado em alguma venda, e só libera o botão de excluir
 * quando não estiver — a mesma UX de `components/finance/DeletePlanModal.js`.
 */
export default function DeleteConfirmModal({
  title,
  itemLabel,
  blockedMessage,
  safeMessage,
  error,
  onClose,
  onDelete,
  checkUsage,
}) {
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoadingUsage(true);
      const inUse = await checkUsage();
      if (isMounted) {
        setIsBlocked(Boolean(inUse));
        setIsLoadingUsage(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [checkUsage]);

  const canDelete =
    confirmationText === KEYWORD && !isBlocked && !isLoadingUsage;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isDeleting) return;
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "Enter" && canDelete) {
        event.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, isDeleting, canDelete]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-3"
      style={{ margin: 0 }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-700">{title}</h3>
          <button onClick={onClose} disabled={isDeleting}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="text-center">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-red-600" />
          <p className="mt-4 text-lg">
            Você tem certeza que deseja excluir:
            <br />
            <strong className="text-gray-900">{itemLabel}</strong>?
          </p>
          <p className="text-sm text-gray-600">
            Esta ação não pode ser desfeita.
          </p>
        </div>

        <div
          className={`mt-6 p-4 border rounded-md ${
            isLoadingUsage
              ? "bg-yellow-50 border-yellow-300"
              : isBlocked
                ? "bg-red-50 border-red-300"
                : "bg-green-50 border-green-300"
          }`}
        >
          {isLoadingUsage ? (
            <p className="text-center text-gray-700">Verificando...</p>
          ) : isBlocked ? (
            <p className="text-center font-medium text-red-800">
              {blockedMessage}
            </p>
          ) : (
            <p className="text-center font-medium text-green-800">
              {safeMessage}
            </p>
          )}
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-700 mb-2">
            Para confirmar, digite <strong>{KEYWORD}</strong> no campo abaixo:
          </p>
          <FormInput
            name="confirmation"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={isDeleting || isBlocked || isLoadingUsage}
          />
        </div>

        {error && (
          <Alert type="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3 sm:gap-0 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
            size="small"
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            disabled={!canDelete || isDeleting}
            size="small"
            className="w-full sm:w-auto"
          >
            Excluir Permanentemente
          </Button>
        </div>
      </div>
    </div>
  );
}
