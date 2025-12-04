import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Alert from "components/ui/Alert";
import { FiX } from "react-icons/fi";
import Switch from "components/ui/Switch";

const SubscriptionFormModal = ({
  mode,
  subscription,
  userId,
  plans,
  error,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = mode === "edit";

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const defaultData = {
      plan_id: plans && plans.length > 0 ? plans[0].id : "",
      user_id: userId,
      discount_value: "", // Corrigido de "0.00" para ""
      payment_day: "", // Corrigido de "10" para ""
      start_date: today,
    };

    if (isEdit && subscription) {
      setFormData({
        discount_value: subscription.discount_value,
        is_active: subscription.is_active,
      });
    } else {
      setFormData(defaultData);
    }
  }, [mode, subscription, userId, plans, isEdit, today]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Precisamos tratar o 'is_active' separadamente se for o Switch
    if (name === "is_active") {
      setFormData((prev) => ({
        ...prev,
        is_active: !prev.is_active, // Inverte o valor booleano
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handler específico para o Switch (mais seguro)
  const handleSwitchChange = () => {
    setFormData((prev) => ({
      ...prev,
      is_active: !prev.is_active,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Adiciona o valor padrão 0 se o desconto for deixado em branco
    const dataToSubmit = {
      ...formData,
      discount_value: formData.discount_value || "0.00",
    };
    await onSubmit(dataToSubmit);
    setIsLoading(false);
  };

  const title = isEdit ? "Editar Assinatura" : "Adicionar Assinatura";

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Bloqueia ações se já estiver processando a deleção
      if (isLoading) return;

      if (event.key === "Escape") {
        onClose();
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mx-3">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} disabled={isLoading}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit ? (
            // --- MODO EDITAR (com labels) ---
            <>
              <p>
                Plano:{" "}
                <strong className="font-semibold">
                  {subscription.plan_name}
                </strong>
              </p>
              <div>
                <label
                  htmlFor="discount_value"
                  className="block text-sm font-medium text-gray-700"
                >
                  Desconto (ex: 10.00)
                </label>
                <FormInput
                  id="discount_value"
                  name="discount_value"
                  type="number"
                  step="0.01"
                  min="0" // <-- ADICIONADO
                  value={formData.discount_value || ""}
                  placeholder="0.00"
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-gray-900">
                  Assinatura Ativa
                </span>
                <Switch
                  checked={formData.is_active || false}
                  onChange={handleSwitchChange} // Usa o handler específico
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            // --- MODO CRIAR (com labels e min/max) ---
            <>
              <div>
                <label
                  htmlFor="plan_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Plano
                </label>
                <select
                  id="plan_id"
                  name="plan_id"
                  value={formData.plan_id || ""}
                  onChange={handleChange}
                  className="mt-1 py-2 w-full rounded-md border border-gray-300 text-sm font-medium text-gray-700"
                >
                  {plans.length === 0 && (
                    <option disabled>Carregando planos...</option>
                  )}
                  {plans.map((plan) => (
                    <option
                      key={plan.id}
                      value={plan.id}
                      className="text-sm font-medium text-gray-700"
                    >
                      {plan.name} (R$ {plan.full_value})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="discount_value"
                  className="block text-sm font-medium text-gray-700"
                >
                  Desconto (ex: 10.00)
                </label>
                <FormInput
                  id="discount_value"
                  name="discount_value"
                  type="number"
                  step="0.01"
                  min="0" // <-- ADICIONADO
                  value={formData.discount_value || ""}
                  placeholder="0.00"
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="payment_day"
                  className="block text-sm font-medium text-gray-700"
                >
                  Dia do Pagamento (1-28)
                </label>
                <FormInput
                  id="payment_day"
                  name="payment_day"
                  type="number"
                  min="1" // <-- ADICIONADO
                  max="28" // <-- ADICIONADO
                  value={formData.payment_day || ""}
                  placeholder="10"
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label
                  htmlFor="start_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Data de Início da Assinatura
                </label>
                <FormInput
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date || ""}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            </>
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
              {isEdit ? "Salvar Alterações" : "Adicionar Assinatura"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionFormModal;
