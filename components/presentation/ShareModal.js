import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import Switch from "components/ui/Switch";
import { FiX, FiShare2, FiEye, FiEyeOff, FiPower } from "react-icons/fi";

/**
 * Modal para gerenciar a flag 'is_public' (Compartilhamento).
 *
 */
export default function ShareModal({ presentation, error, onClose, onSubmit }) {
  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (presentation) {
      setIsPublic(presentation.is_public || false);
      setIsActive(presentation.is_active || false);
    }
  }, [presentation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(isPublic, isActive);
    setIsLoading(false);
  };

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Bloqueia ações se já estiver processando a deleção
      if (isLoading) return;

      if (event.key === "Escape") {
        onClose();
      }

      // Enter só funciona se a validação (canDelete) for verdadeira
      if (event.key === "Enter") {
        event.preventDefault(); // Evita submit padrão de formulário se houver
        handleSubmit(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, handleSubmit, isLoading]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FiShare2 /> Compartilhar Apresentação
          </h3>
          <button onClick={onClose} disabled={isLoading}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2 text-gray-800 font-semibold">
                <FiPower
                  className={isActive ? "text-green-600" : "text-red-500"}
                />
                <span>Apresentação Ativa</span>
              </div>
              <Switch
                checked={isActive}
                onChange={() => setIsActive(!isActive)}
                disabled={isLoading}
              />
            </div>
            <p className="text-sm text-gray-500 text-justify">
              Se desativada, a apresentação ficará <strong>invisível</strong>{" "}
              para todos os usuários (incluindo o elenco), exceto para você.
            </p>
          </div>
          {/* ------------------------------------- */}

          {/* Controle de Público/Privado (Existente, com leve ajuste de layout) */}
          <div className="bg-white p-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium flex items-center gap-2">
                {isPublic ? <FiEye /> : <FiEyeOff />}
                {isPublic ? "Público" : "Privado"}
              </span>
              <Switch
                checked={isPublic}
                onChange={() => setIsPublic(!isPublic)}
                disabled={isLoading}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {isPublic
                ? "Qualquer pessoa com o link pode visualizar."
                : "Apenas usuários adicionados ao elenco podem visualizar."}
            </p>

            {isPublic && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Link para compartilhamento
                </label>
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="w-full rounded-md border border-gray-300 text-sm bg-gray-100 px-3 py-2 text-gray-600 focus:outline-none cursor-copy"
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              size="small"
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading}
              size="small"
              className="w-full sm:w-auto"
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
