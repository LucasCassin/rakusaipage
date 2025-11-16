import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Alert from "components/ui/Alert";
import { FiX } from "react-icons/fi";
import { settings } from "config/settings.js"; // <-- 1. IMPORTAR SETTINGS
import AssigneeManager from "./AssigneeManager"; // <-- 2. IMPORTAR NOVO COMPONENTE

/**
 * Modal para criar ou editar um TransitionStep (item da checklist).
 * (Este é o formulário, não o item da lista)
 */
export default function TransitionStepModal({
  modalData, // { mode, step? }
  cast,
  error,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { isLoading: isLoadingCast } = cast;
  const { mode, step } = modalData || {};
  const isCreate = mode === "create";

  // --- 3. ATUALIZAR USEEFFECT ---
  useEffect(() => {
    if (isCreate) {
      setFormData({
        description: "",
        assignees: [], // <-- MUDANÇA
      });
    } else if (step) {
      setFormData({
        description: step.description || "",
        assignees: step.assignees || [], // <-- MUDANÇA
        order: step.order,
      });
    }
  }, [modalData, step, isCreate]);
  // --- FIM DA MUDANÇA ---

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- 4. NOVO HANDLER PARA O ARRAY ---
  const handleAssigneesChange = (newAssigneesArray) => {
    setFormData((prev) => ({ ...prev, assignees: newAssigneesArray }));
  };
  // --- FIM DO NOVO HANDLER ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(formData); // Chama a função 'saveStep' do hook
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isCreate ? "Adicionar Passo" : "Editar Passo"}
          </h3>
          <button onClick={onClose}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <FormInput
            label="Descrição"
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
            placeholder="Ex: Tocar 1, 2, 3..."
            required
            maxLength={500}
            disabled={isLoading}
          />

          {/* --- 5. SUBSTITUIR O SELECT --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuários Associados
            </label>
            <AssigneeManager
              cast={cast}
              currentAssignees={formData.assignees}
              onChange={handleAssigneesChange}
              maxLimit={settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_STEP}
            />
          </div>
          {/* --- FIM DA SUBSTITUIÇÃO --- */}

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
              {isCreate ? "Adicionar Passo" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
