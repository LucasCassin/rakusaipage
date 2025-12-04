import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Alert from "components/ui/Alert";
import { FiX } from "react-icons/fi";

const PlanFormModal = ({ mode, plan, error, onClose, onSubmit, getStats }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    full_value: "",
    period_unit: "month",
    period_value: "1",
  });

  // (O resto dos estados permanece o mesmo)
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [impactCount, setImpactCount] = useState(0);
  const [confirmationText, setConfirmationText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isEdit = mode === "edit";
  const KEYWORD = "EDITAR";

  // (O useEffect permanece o mesmo)
  useEffect(() => {
    if (isEdit && plan) {
      setFormData({
        name: plan.name || "",
        description: plan.description || "",
        full_value: plan.full_value || "",
        period_unit: plan.period_unit || "month",
        period_value: plan.period_value || "1",
      });

      const fetchStats = async () => {
        setIsLoadingStats(true);
        const stats = await getStats(plan.id);
        if (stats) {
          setImpactCount(stats.activeSubscriptions);
        }
        setIsLoadingStats(false);
      };
      fetchStats();
    }
  }, [mode, plan, getStats, isEdit]);

  // (handleChange e handleSubmit permanecem os mesmos)
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

  const title = mode === "create" ? "Criar Novo Plano" : "Editar Plano";
  const canSubmit = !isEdit || (isEdit && confirmationText === KEYWORD);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Bloqueia ações se já estiver processando a deleção
      if (isLoading) return;

      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "Enter" && canSubmit) {
        event.preventDefault(); // Evita submit padrão de formulário se houver
        handleSubmit(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, handleSubmit, isLoading, canSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 mx-3">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} disabled={isLoading}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* --- FORMULÁRIO COM LABELS CORRIGIDOS --- */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Nome do Plano
            </label>
            <FormInput
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1" // Adiciona margem
            />
          </div>

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
              value={formData.description}
              onChange={handleChange}
              className="mt-1"
            />
          </div>

          <div>
            <label
              htmlFor="full_value"
              className="block text-sm font-medium text-gray-700"
            >
              Valor (ex: 150.00)
            </label>
            <FormInput
              id="full_value"
              name="full_value"
              type="number"
              step="0.01"
              value={formData.full_value}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label
                htmlFor="period_value"
                className="block text-sm font-medium text-gray-700"
              >
                Período (Valor)
              </label>
              <FormInput
                id="period_value"
                name="period_value"
                type="number"
                min="1"
                value={formData.period_value}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="period_unit"
                className="block text-sm font-medium text-gray-700"
              >
                Período (Unidade)
              </label>
              <select
                id="period_unit"
                name="period_unit"
                value={formData.period_unit}
                onChange={handleChange}
                className="mt-1 py-2 w-full rounded-md border border-gray-300 sm:text-sm"
              >
                <option value="day">Dia</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
                <option value="year">Ano</option>
              </select>
            </div>
          </div>
          {/* --- FIM DA CORREÇÃO DE LABELS --- */}

          {/* (Seção de "Editar" permanece a mesma) */}
          {isEdit && (
            <>
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-md">
                {isLoadingStats ? (
                  <p className="text-center text-gray-700">Verificando...</p>
                ) : (
                  <p className="text-center font-medium text-yellow-800">
                    Atenção: Esta alteração impactará{" "}
                    <strong>{impactCount} assinatura(s) ativa(s)</strong>.
                  </p>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-700 mb-2">
                  Para confirmar, digite <strong>{KEYWORD}</strong> no campo
                  abaixo:
                </p>
                <FormInput
                  name="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          {error && <Alert type="error">{error}</Alert>}

          {/* --- CORREÇÃO DO LAYOUT DOS BOTÕES --- */}
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
              disabled={!canSubmit || isLoading}
              size="small"
              className="w-full sm:w-auto"
            >
              {mode === "create" ? "Criar Plano" : "Salvar Alterações"}
            </Button>
          </div>
          {/* --- FIM DA CORREÇÃO DOS BOTÕES --- */}
        </form>
      </div>
    </div>
  );
};

export default PlanFormModal;
