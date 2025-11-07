import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Alert from "components/ui/Alert";
import { FiX, FiTrash2 } from "react-icons/fi";

/**
 * Modal para criar ou editar um SceneElement.
 */
export default function SceneElementModal({
  modalData,
  cast,
  error,
  onClose,
  onSubmit,
  onDelete, // <-- 1. NOVA PROP (vem do hook 'deleteElement')
}) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { viewers = [], isLoading: isLoadingCast } = cast;
  const { mode, element_type_name } = modalData || {};
  const isCreate = mode === "create";

  // --- 2. VERIFICAR SE É O "PALCO" (Bug 2) ---
  const isStageLine = element_type_name === "Palco";
  // --- FIM DA MUDANÇA ---

  useEffect(() => {
    if (modalData) {
      setFormData({
        display_name: modalData.display_name || "",
        assigned_user_id: modalData.assigned_user_id || "",
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
    await onSubmit(formData);
    setIsLoading(false);
  };

  // --- 3. HANDLER DE DELEÇÃO (Bug 1) ---
  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(modalData.id); // Chama 'deleteElement' do hook
    setIsDeleting(false);
    // (O hook otimista fechará o modal)
  };
  // --- FIM DA MUDANÇA ---

  const title = isCreate
    ? `Adicionar: ${modalData.element_type_name}`
    : `Editar: ${modalData.element_type_name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} disabled={isLoading || isDeleting}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* --- 4. RENDERIZAÇÃO CONDICIONAL (Bug 2) --- */}
          {/* Se *NÃO* for a linha do palco, mostra os campos */}
          {!isStageLine && (
            <>
              <div>
                <label
                  htmlFor="display_name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nome de Exibição (ex: "Lucas")
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
                      {viewers.map((viewer) => (
                        <option key={viewer.id} value={viewer.id}>
                          {viewer.username}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </>
          )}
          {/* Se *FOR* a linha do palco, mostra uma mensagem */}
          {isStageLine && (
            <Alert type="info">
              {isCreate
                ? "Clique em 'Adicionar' para inserir a linha do palco."
                : "Você pode mover esta linha arrastando-a no editor."}
            </Alert>
          )}
          {/* --- FIM DA MUDANÇA --- */}

          {error && <Alert type="error">{error}</Alert>}

          {/* --- 5. BOTÕES ATUALIZADOS (Bug 1) --- */}
          <div className="flex justify-between items-center pt-4">
            <div>
              {/* Botão de Deletar (aparece no modo "edit" para TUDO) */}
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
          {/* --- FIM DA MUDANÇA --- */}
        </form>
      </div>
    </div>
  );
}
