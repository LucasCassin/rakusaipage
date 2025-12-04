import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Alert from "components/ui/Alert";
import { FiX } from "react-icons/fi";

/**
 * Modal para CRIAR ou EDITAR uma Cena (Formation ou Transition).
 */
export default function SceneFormModal({
  modalData,
  error,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scene_type: "FORMATION",
  });
  const [isLoading, setIsLoading] = useState(false);

  const { mode, scene } = modalData || {};
  const isCreate = mode === "create";

  useEffect(() => {
    if (isCreate) {
      setFormData({
        name: "",
        description: "",
        scene_type: "FORMATION",
      });
    } else if (scene) {
      setFormData({
        name: scene.name || "",
        description: scene.description || "",
        scene_type: scene.scene_type,
      });
    }
  }, [modalData, scene, isCreate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(formData);
    setIsLoading(false);
  };

  const title = isCreate ? "Adicionar Nova Cena" : "Editar Cena";

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
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} disabled={isLoading}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Nome da Cena
            </label>
            <FormInput
              id="name"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              placeholder="Ex: Hajime"
              required
              className="mt-1"
            />
          </div>

          {/* O tipo (FORMATION/TRANSITION) só é escolhido na criação */}
          {isCreate && (
            <div>
              <label
                htmlFor="scene_type"
                className="block text-sm font-medium text-gray-700"
              >
                Tipo de Cena
              </label>
              <select
                id="scene_type"
                name="scene_type"
                value={formData.scene_type}
                onChange={handleChange}
                className="mt-1 py-2 px-3 w-full rounded-md border border-gray-300 text-sm font-medium text-gray-700"
              >
                <option value="FORMATION">Formação (Mapa de Palco)</option>
                <option value="TRANSITION">Transição (Checklist)</option>
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Descrição (Opcional)
            </label>
            <FormInput
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              placeholder="Adicione aqui algum complemento"
              className="mt-1"
            />
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
              {isCreate ? "Adicionar Cena" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
