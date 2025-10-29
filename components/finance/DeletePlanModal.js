import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import FormInput from "components/forms/FormInput";
import { FiX, FiAlertTriangle } from "react-icons/fi";
// import Loader from "components/ui/Loader"; // <-- Removido

const DeletePlanModal = ({ plan, error, onClose, onDelete, getStats }) => {
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [impactCount, setImpactCount] = useState(0);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const KEYWORD = "DELETAR";

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      const stats = await getStats(plan.id);
      if (stats) {
        setImpactCount(stats.activeSubscriptions);
      }
      setIsLoadingStats(false);
    };
    fetchStats();
  }, [plan.id, getStats]);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  };

  const canDelete = confirmationText === KEYWORD;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-red-700">Deletar Plano</h3>
          <button onClick={onClose} disabled={isDeleting}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="text-center">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-red-600" />
          <p className="mt-4 text-lg">
            Você tem certeza que deseja deletar o plano:
            <br />
            <strong className="text-gray-900">{plan.name}</strong>?
          </p>
          <p className="text-sm text-gray-600">
            Esta ação não pode ser desfeita.
          </p>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-md">
          {isLoadingStats ? (
            // --- CORREÇÃO DO SPINNER ---
            <p className="text-center text-gray-700">Verificando...</p>
          ) : (
            <p className="text-center font-medium text-yellow-800">
              Atenção: Este plano está sendo usado por{" "}
              <strong>{impactCount} assinatura(s) ativa(s)</strong>.
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
            disabled={isDeleting}
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
            size="small" // <-- CORREÇÃO DA ALTURA DO BOTÃO
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            disabled={!canDelete || isDeleting}
            size="small" // <-- CORREÇÃO DA ALTURA DO BOTÃO
          >
            Deletar Permanentemente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeletePlanModal;
