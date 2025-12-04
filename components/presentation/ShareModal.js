import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import Switch from "components/ui/Switch";
import { FiX, FiShare2, FiEye, FiEyeOff } from "react-icons/fi";

/**
 * Modal para gerenciar a flag 'is_public' (Compartilhamento).
 *
 */
export default function ShareModal({ presentation, error, onClose, onSubmit }) {
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (presentation) {
      setIsPublic(presentation.is_public || false);
    }
  }, [presentation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(isPublic);
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
          <div className="p-4 bg-gray-50 rounded-lg border">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-800">Link Público</span>
              <Switch
                checked={isPublic}
                onChange={() => setIsPublic(!isPublic)}
                disabled={isLoading}
              />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {isPublic ? (
                <span className="flex items-center gap-2 text-green-700">
                  <FiEye />
                  Qualquer pessoa com o link pode ver.
                </span>
              ) : (
                <span className="flex items-center gap-2 text-red-700">
                  <FiEyeOff />
                  Apenas membros do elenco podem ver.
                </span>
              )}
            </p>
          </div>

          {/* Mostra a URL se estiver público */}
          {isPublic && (
            <div>
              <label
                htmlFor="share-url"
                className="block text-sm font-medium text-gray-700"
              >
                Copie este link:
              </label>
              <input
                id="share-url"
                type="text"
                readOnly
                value={currentUrl}
                className="mt-1 w-full rounded-md border border-gray-300 text-sm bg-gray-100"
                onClick={(e) => e.target.select()}
              />
            </div>
          )}

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
