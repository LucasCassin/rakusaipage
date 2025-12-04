import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import FormInput from "components/forms/FormInput";
import { FiX, FiAlertTriangle } from "react-icons/fi";

const DeletePlanModal = ({ plan, error, onClose, onDelete, getStats }) => {
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [impactCount, setImpactCount] = useState(0); // Agora é a contagem TOTAL
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const KEYWORD = "DELETAR";

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      const stats = await getStats(plan.id);
      if (stats) {
        // --- MUDANÇA AQUI ---
        // Usa 'totalSubscriptions' para bloquear a exclusão
        setImpactCount(stats.totalSubscriptions);
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

  // --- LÓGICA DE DESABILITAÇÃO ATUALIZADA ---
  // Não pode deletar se estiver em uso OU se a keyword estiver errada
  const isBlocked = impactCount > 0;
  const canDelete = confirmationText === KEYWORD && !isBlocked;

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Bloqueia ações se já estiver processando a deleção
      if (isDeleting) return;

      if (event.key === "Escape") {
        onClose();
      }

      // Enter só funciona se a validação (canDelete) for verdadeira
      if (event.key === "Enter" && canDelete && !isBlocked) {
        event.preventDefault(); // Evita submit padrão de formulário se houver
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, handleDelete, isDeleting, canDelete, isBlocked]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mx-3">
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

        {/* --- LÓGICA DE AVISO ATUALIZADA --- */}
        <div
          className={`mt-6 p-4 border rounded-md ${
            isLoadingStats
              ? "bg-yellow-50 border-yellow-300" // Carregando
              : isBlocked
                ? "bg-red-50 border-red-300" // Cor de Erro
                : "bg-green-50 border-green-300" // Cor verde
          }`}
        >
          {isLoadingStats ? (
            <p className="text-center text-gray-700">Verificando...</p>
          ) : isBlocked ? (
            // Mensagem de Bloqueio
            <p className="text-center font-medium text-red-800">
              Este plano está associado a{" "}
              <strong>{impactCount} assinatura(s)</strong> (ativas ou inativas)
              e não pode ser excluído.
            </p>
          ) : (
            // Mensagem de "Ok"
            <p className="text-center font-medium text-green-800">
              Este plano não está em uso e pode ser excluído com segurança.
            </p>
          )}
        </div>
        {/* --- FIM DA ATUALIZAÇÃO --- */}

        <div className="mt-6">
          <p className="text-sm text-gray-700 mb-2">
            Para confirmar, digite <strong>{KEYWORD}</strong> no campo abaixo:
          </p>
          <FormInput
            name="confirmation"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={isDeleting || isBlocked || isLoadingStats} // <-- Desabilita se estiver bloqueado
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
            // Desabilita se a keyword estiver errada OU se estiver bloqueado
            disabled={!canDelete || isDeleting || isBlocked}
            size="small"
            className="w-full sm:w-auto"
          >
            Deletar Permanentemente
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeletePlanModal;
