import React, { useState } from "react";
import Button from "components/ui/Button"; //
import Alert from "components/ui/Alert"; //
import { FiX, FiAlertTriangle } from "react-icons/fi";

/**
 * Modal que pergunta se a edição de um elemento (nome/usuário)
 * deve ser local (só nesta cena) ou global (em todas as cenas).
 *
 */
export default function ConfirmGlobalEditModal({
  modalData, // { oldData, newData, ... }
  error,
  onClose,
  onUpdateLocal, // (Função do hook)
  onUpdateGlobal, // (Função do hook)
}) {
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const isLoading = isLoadingLocal || isLoadingGlobal;

  const { oldData, newData } = modalData || {};

  // Handlers que chamam as funções do hook
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

  // Constrói a mensagem de mudança
  const changes = [];
  if (newData?.display_name !== oldData?.display_name) {
    changes.push(
      `Nome de "${oldData?.display_name || "Ninguém"}" para "${
        newData?.display_name || "Ninguém"
      }"`,
    );
  }
  if (newData?.assigned_user_id !== oldData?.assigned_user_id) {
    changes.push(
      `Usuário associado (agora ID: ${newData?.assigned_user_id || "Nenhum"})`,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            Confirmar Alteração
          </h3>
          <button onClick={onClose} disabled={isLoading}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="text-center">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-rakusai-yellow-dark" />
          <p className="mt-4 text-lg font-semibold">
            Você aplicou as seguintes mudanças:
          </p>
          <div className="mt-2 text-gray-700 space-y-1">
            {changes.map((change, i) => (
              <span key={i} className="block">
                {change}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-center font-medium text-gray-800">
            Como você quer salvar esta alteração?
          </p>
        </div>

        {error && (
          <Alert type="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Button
            type="button"
            variant="primary" //
            onClick={handleLocal}
            isLoading={isLoadingLocal}
            disabled={isLoading}
            size="large" //
            className="w-full"
          >
            Salvar apenas nesta cena
          </Button>

          <Button
            type="button"
            variant="warning" //
            onClick={handleGlobal}
            isLoading={isLoadingGlobal}
            disabled={isLoading}
            size="large"
            className="w-full"
          >
            Salvar em TODAS as cenas
          </Button>
        </div>

        <div className="mt-4 text-center">
          <Button
            type="button"
            variant="link" //
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
