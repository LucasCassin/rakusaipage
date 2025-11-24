import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Alert from "components/ui/Alert";
import { FiX } from "react-icons/fi";
import { settings } from "config/settings.js";
import AssigneeSelect from "./AssigneeSelect";

export default function TransitionStepModal({
  modalData,
  cast,
  error,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const { viewers = [], isLoading: isLoadingCast } = cast;
  const { mode, step } = modalData || {};
  const isCreate = mode === "create";

  useEffect(() => {
    if (isCreate) {
      setFormData({
        description: "",
        assignees: [],
      });
    } else if (step) {
      setFormData({
        description: step.description || "",
        assignees: step.assignees || [],
        order: step.order,
      });
    }
  }, [modalData, step, isCreate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssigneesChange = (newAssignees) => {
    setFormData((prev) => ({ ...prev, assignees: newAssignees }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(formData);
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
            placeholder="Ex: Entrar com shime"
            required
            maxLength={500}
            disabled={isLoading}
          />

          {/* --- NOVO SELETOR --- */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuários Associados
            </label>
            <AssigneeSelect
              cast={viewers}
              selectedIds={formData.assignees || []}
              onChange={handleAssigneesChange}
              maxLimit={settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_STEP}
              disabled={isLoading || isLoadingCast}
            />
          </div>
          {/* -------------------- */}

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
