import React, { useState } from "react";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import { FiX, FiClipboard } from "react-icons/fi";

/**
 * Modal para selecionar as opções de colagem (Clone).
 */
export default function PasteSceneModal({
  sceneName, // Nome da cena no clipboard (para confirmação)
  error,
  onClose,
  onSubmit, // (Função (pasteOption) => ...)
}) {
  const [pasteOption, setPasteOption] = useState("with_users"); // Padrão
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(pasteOption);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FiClipboard /> Colar Cena
          </h3>
          <button onClick={onClose} disabled={isLoading}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-gray-700">
            Você está prestes a colar a cena:{" "}
            <strong className="text-gray-900">{sceneName}</strong>
          </p>

          <p className="text-sm font-medium text-gray-800">
            Como você deseja colar os elementos?
          </p>

          {/* Opções de Colagem (Radio Group) */}
          <div className="space-y-3">
            <label className="flex items-start p-3 border rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="pasteOption"
                value="with_users"
                checked={pasteOption === "with_users"}
                onChange={() => setPasteOption("with_users")}
                className="mt-1"
              />
              <div className="ml-3">
                <span className="font-semibold block">
                  Instrumentos, Nomes e Usuários
                </span>
                <span className="text-sm text-gray-600">
                  Copia tudo. Adiciona usuários ao elenco desta apresentação se
                  necessário.
                </span>
              </div>
            </label>

            <label className="flex items-start p-3 border rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="pasteOption"
                value="with_names"
                checked={pasteOption === "with_names"}
                onChange={() => setPasteOption("with_names")}
                className="mt-1"
              />
              <div className="ml-3">
                <span className="font-semibold block">
                  Instrumentos e Nomes
                </span>
                <span className="text-sm text-gray-600">
                  Copia os nomes (ex: "Líder"), mas remove os usuários
                  associados.
                </span>
              </div>
            </label>

            <label className="flex items-start p-3 border rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="pasteOption"
                value="elements_only"
                checked={pasteOption === "elements_only"}
                onChange={() => setPasteOption("elements_only")}
                className="mt-1"
              />
              <div className="ml-3">
                <span className="font-semibold block">Apenas Instrumentos</span>
                <span className="text-sm text-gray-600">
                  Copia apenas a posição dos instrumentos, sem nomes ou
                  usuários.
                </span>
              </div>
            </label>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              size="small"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isLoading}
              size="small"
            >
              Colar Cena
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
