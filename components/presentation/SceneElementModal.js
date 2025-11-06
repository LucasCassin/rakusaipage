import React, { useState, useEffect } from "react";
import Button from "components/ui/Button"; //
import FormInput from "components/forms/FormInput"; //
import Alert from "components/ui/Alert"; //
import { FiX } from "react-icons/fi";

/**
 * Modal para criar ou editar um SceneElement.
 *
 */
export default function SceneElementModal({
  modalData,
  cast,
  error,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { viewers = [], isLoading: isLoadingCast } = cast;
  const isCreate = modalData?.mode === "create";

  // Preenche o formulário com os dados do item solto (se for 'create')
  // ou do item clicado (se for 'edit' no futuro)
  useEffect(() => {
    if (modalData) {
      setFormData({
        display_name: modalData.display_name || "",
        assigned_user_id: modalData.assigned_user_id || "",
        // Passa os dados-chave escondidos
        element_type_id: modalData.element_type_id,
        position: modalData.position,
        isTemplate: modalData.isTemplate,
      });
    }
  }, [modalData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(formData); // Chama a função 'saveElement' do hook
    setIsLoading(false);
  };

  const title = isCreate
    ? `Adicionar: ${modalData.element_type_name}`
    : `Editar: ${modalData.display_name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
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
              htmlFor="display_name"
              className="block text-sm font-medium text-gray-700"
            >
              Nome de Exibição (ex: "Renan")
            </label>
            <FormInput
              id="display_name"
              name="display_name"
              value={formData.display_name || ""}
              onChange={handleChange}
              placeholder="Opcional"
              className="mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="assigned_user_id"
              className="block text-sm font-medium text-gray-700"
            >
              Associar Usuário (para Destaque)
            </label>
            <select
              id="assigned_user_id"
              name="assigned_user_id"
              value={formData.assigned_user_id || ""}
              onChange={handleChange}
              disabled={isLoadingCast}
              className="mt-1 py-2 w-full rounded-md border border-gray-300 text-sm font-medium text-gray-700"
            >
              {isLoadingCast ? (
                <option>Carregando elenco...</option>
              ) : (
                <>
                  <option value="">Nenhum</option>
                  {/* O dropdown só mostra o "Elenco" */}
                  {viewers.map((viewer) => (
                    <option key={viewer.id} value={viewer.id}>
                      {viewer.username}
                    </option>
                  ))}
                </>
              )}
            </select>
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
              disabled={isLoading || isLoadingCast}
              size="small"
            >
              {isCreate ? "Adicionar ao Palco" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
