import React, { useState } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Switch from "components/ui/Switch";

export default function PaymentMethodManagement({
  paymentMethods,
  isLoading,
  onCreate,
  onUpdate,
  onRemove,
  onHardDelete,
  onCreateVariant,
  onRemoveVariant,
}) {
  const [newMethodName, setNewMethodName] = useState("");
  const [newVariantNameByMethod, setNewVariantNameByMethod] = useState({});

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

  const handleHardDelete = (method) => {
    if (
      window.confirm(
        `Excluir definitivamente a forma de pagamento "${method.name}" e suas variantes? Esta ação não pode ser desfeita e só é possível se ela nunca foi usada em uma venda.`,
      )
    ) {
      onHardDelete(method.id);
    }
  };

  const handleRemoveVariant = (variant) => {
    if (
      window.confirm(
        `Excluir definitivamente a variante "${variant.name}"? Esta ação não pode ser desfeita e só é possível se ela nunca foi usada em uma venda.`,
      )
    ) {
      onRemoveVariant(variant.id);
    }
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
        <Button type="submit" variant="primary" size="small">
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
                    <span
                      className={
                        method.is_active ? "text-green-700" : "text-gray-400"
                      }
                    >
                      {method.is_active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                  <Button
                    variant="link"
                    size="small"
                    className="text-red-600"
                    onClick={() => handleHardDelete(method)}
                  >
                    Excluir
                  </Button>
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
                      onClick={() => handleRemoveVariant(variant)}
                      className="flex items-center justify-center h-4 w-4 rounded-full bg-red-100 hover:bg-red-200 text-red-600 leading-none"
                      aria-label="Excluir variante"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {method.is_active && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova variante (ex: Máquina Amarela)"
                    className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                    value={newVariantNameByMethod[method.id] || ""}
                    onChange={(e) =>
                      setNewVariantNameByMethod((prev) => ({
                        ...prev,
                        [method.id]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleCreateVariant(method.id)}
                  >
                    + Variante
                  </Button>
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
    </div>
  );
}
