import React, { useState } from "react";
import { FiTrash2, FiPlus } from "react-icons/fi";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Switch from "components/ui/Switch";
import DeleteConfirmModal from "components/pdv/admin/DeleteConfirmModal";

export default function PaymentMethodManagement({
  paymentMethods,
  isLoading,
  onCreate,
  onUpdate,
  onRemove,
  onHardDelete,
  onCheckMethodInUse,
  onCreateVariant,
  onRemoveVariant,
  onCheckVariantInUse,
}) {
  const [newMethodName, setNewMethodName] = useState("");
  const [newVariantNameByMethod, setNewVariantNameByMethod] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleCreateMethod = async (e) => {
    e.preventDefault();
    if (!newMethodName.trim()) return;
    const result = await onCreate(newMethodName.trim());
    if (result) setNewMethodName("");
  };

  const handleCreateVariant = async (methodId) => {
    const name = (newVariantNameByMethod[methodId] || "").trim();
    if (!name) return;
    const result = await onCreateVariant(methodId, name);
    if (result) {
      setNewVariantNameByMethod((prev) => ({ ...prev, [methodId]: "" }));
    }
  };

  const handleToggleActive = (method) => {
    if (method.is_active) {
      onRemove(method.id);
    } else {
      onUpdate(method.id, { is_active: true });
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget.type === "method") {
      await onHardDelete(deleteTarget.method.id);
    } else {
      await onRemoveVariant(deleteTarget.variant.id);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="my-20 border-t border-gray-200 pt-12">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Formas de Pagamento
      </h3>

      <form
        onSubmit={handleCreateMethod}
        className="flex flex-col sm:flex-row gap-3 mb-6"
      >
        <div className="flex-1">
          <FormInput
            id="pdv-payment-method-name"
            name="name"
            placeholder="Nome da forma de pagamento (ex: Pix)"
            value={newMethodName}
            onChange={(e) => setNewMethodName(e.target.value)}
            required
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="small"
          className="w-full sm:w-40"
        >
          + Adicionar
        </Button>
      </form>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-900">
                  {method.name}{" "}
                  {!method.is_active && (
                    <span className="text-xs text-gray-400">(inativa)</span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={method.is_active}
                      onChange={() => handleToggleActive(method)}
                    />
                    <span className="text-gray-700">
                      {method.is_active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: "method", method })}
                    className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white"
                    aria-label="Excluir"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {method.variants?.map((variant) => (
                  <span
                    key={variant.id}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                      variant.is_active
                        ? "bg-rakusai-purple/10 text-rakusai-purple border-rakusai-purple/30"
                        : "bg-gray-100 text-gray-400 border-gray-200"
                    }`}
                  >
                    {variant.name}
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({ type: "variant", method, variant })
                      }
                      className={`flex items-center justify-center h-4 w-4 rounded-full leading-none ${
                        variant.is_active
                          ? "text-rakusai-purple/70 hover:bg-rakusai-purple/20 hover:text-rakusai-purple"
                          : "text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                      }`}
                      aria-label="Excluir variante"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {method.is_active && (
                <div className="flex items-stretch border border-gray-300 rounded-md overflow-hidden">
                  <input
                    type="text"
                    placeholder="Nova variante (ex: Máquina Amarela)"
                    className="flex-1 min-w-0 px-3 py-1.5 border-0 text-sm focus:outline-none"
                    value={newVariantNameByMethod[method.id] || ""}
                    onChange={(e) =>
                      setNewVariantNameByMethod((prev) => ({
                        ...prev,
                        [method.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateVariant(method.id);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateVariant(method.id)}
                    className="flex items-center justify-center px-4 border-l border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-rakusai-purple"
                    aria-label="Adicionar variante"
                  >
                    <FiPlus size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {paymentMethods.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Nenhuma forma de pagamento cadastrada.
            </p>
          )}
        </div>
      )}

      {deleteTarget?.type === "method" && (
        <DeleteConfirmModal
          title="Excluir Forma de Pagamento"
          itemLabel={deleteTarget.method.name}
          blockedMessage="Esta forma de pagamento já foi usada em uma venda e não pode ser excluída. Use o botão de ativar/inativar em vez de excluir."
          safeMessage="Esta forma de pagamento nunca foi usada em uma venda e pode ser excluída com segurança."
          onClose={() => setDeleteTarget(null)}
          onDelete={handleConfirmDelete}
          checkUsage={() => onCheckMethodInUse(deleteTarget.method.id)}
        />
      )}

      {deleteTarget?.type === "variant" && (
        <DeleteConfirmModal
          title="Excluir Variante"
          itemLabel={deleteTarget.variant.name}
          blockedMessage="Esta variante já foi usada em uma venda e não pode ser excluída."
          safeMessage="Esta variante nunca foi usada em uma venda e pode ser excluída com segurança."
          onClose={() => setDeleteTarget(null)}
          onDelete={handleConfirmDelete}
          checkUsage={() => onCheckVariantInUse(deleteTarget.variant.id)}
        />
      )}
    </div>
  );
}
