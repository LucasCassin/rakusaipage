import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Alert from "components/ui/Alert";
import { FiX, FiTrash2 } from "react-icons/fi";
import { settings } from "config/settings.js";
import AssigneeSelect from "./AssigneeSelect";

export default function SceneElementModal({
  modalData,
  cast,
  error,
  onClose,
  onSubmit,
  onDelete,
}) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { viewers = [], isLoading: isLoadingCast } = cast;
  const { mode, element_type_name } = modalData || {};
  const isCreate = mode === "create";
  const isStageLine = element_type_name === "Palco";

  useEffect(() => {
    if (modalData) {
      setFormData({
        display_name: modalData.display_name || "",
        assignees: modalData.assignees || [],
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

  const handleAssigneesChange = (newAssignees) => {
    setFormData((prev) => ({ ...prev, assignees: newAssignees }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await onSubmit(formData);
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!modalData?.id) return;
    setIsDeleting(true);
    await onDelete(modalData.id);
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isCreate ? "Adicionar " : "Editar "}
            {element_type_name || "Elemento"}
          </h3>
          <button onClick={onClose}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {!isStageLine && (
            <>
              <FormInput
                label="Nome de Exibição (Opcional)"
                name="display_name"
                value={formData.display_name || ""}
                onChange={handleChange}
                placeholder="Ex: Lucas"
                maxLength={50}
                disabled={isLoading || isDeleting}
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
                  maxLimit={
                    settings.global.STAGE_MAP_LOGIC.MAX_ASSIGNEES_PER_GROUP
                  }
                  disabled={isLoading || isDeleting || isLoadingCast}
                />
              </div>
              {/* -------------------- */}
            </>
          )}

          {error && <Alert type="error">{error}</Alert>}

          <div className="flex justify-between items-center pt-4">
            <div>
              {!isCreate && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                  disabled={isLoading || isDeleting}
                  size="small"
                >
                  <FiTrash2 className="mr-2" />
                  Excluir
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isLoading || isDeleting}
                size="small"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={
                  isLoading || isDeleting || (isLoadingCast && !isStageLine)
                }
                size="small"
              >
                {isCreate ? "Adicionar ao Palco" : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
