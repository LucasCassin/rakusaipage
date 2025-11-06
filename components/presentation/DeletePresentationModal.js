import React, { useState } from "react";
import Button from "components/ui/Button"; //
import Alert from "components/ui/Alert"; //
import FormInput from "components/forms/FormInput"; //
import { FiX, FiAlertTriangle } from "react-icons/fi";

/**
 * Modal para CONFIRMAR a deleção de uma apresentação.
 * Baseado no 'DeletePlanModal.js'.
 */
export default function DeletePresentationModal({
  presentation,
  error,
  onClose,
  onDelete,
}) {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const KEYWORD = "DELETAR";

  const handleDelete = async () => {
    setIsDeleting(true);
    // Chama o 'deletePresentation' do hook
    await onDelete();
    setIsDeleting(false);
  };

  const canDelete = confirmationText === KEYWORD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-700">
            Deletar Apresentação
          </h3>
          <button onClick={onClose} disabled={isDeleting}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="text-center">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-red-600" />
          <p className="mt-4 text-lg">
            Você tem certeza que deseja deletar a apresentação:
            <br />
            <strong className="text-gray-900">{presentation?.name}</strong>?
          </p>
          <p className="text-sm text-gray-600">
            Esta ação não pode ser desfeita. Todos os mapas de palco, cenas e
            elementos associados serão perdidos permanentemente.
          </p>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-700 mb-2">
            Para confirmar, digite <strong>{KEYWORD}</strong> no campo abaixo:
          </p>
          <FormInput
            name="confirmation"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={isDeleting}
            className="border-red-300 focus:ring-red-500"
          />
        </div>

        {error && (
          <Alert type="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="flex justify-between items-center pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
            size="small"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger" //
            onClick={handleDelete}
            isLoading={isDeleting}
            disabled={!canDelete || isDeleting}
            size="small"
          >
            Deletar Permanentemente
          </Button>
        </div>
      </div>
    </div>
  );
}
