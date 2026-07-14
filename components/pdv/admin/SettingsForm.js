import React, { useState, useEffect } from "react";
import { FiCheckCircle } from "react-icons/fi";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";

export default function SettingsForm({ pdvSettings, isLoading, onUpdate }) {
  const [formData, setFormData] = useState({
    min_cart_value_in_cents: "0",
    max_discount_in_cents: "",
    max_discount_percentage: "",
    default_cart_discount_type: "none",
    default_cart_discount_value: "",
  });
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  useEffect(() => {
    if (pdvSettings) {
      setFormData({
        min_cart_value_in_cents: (
          pdvSettings.min_cart_value_in_cents / 100
        ).toFixed(2),
        max_discount_in_cents:
          pdvSettings.max_discount_in_cents != null
            ? (pdvSettings.max_discount_in_cents / 100).toFixed(2)
            : "",
        max_discount_percentage:
          pdvSettings.max_discount_percentage != null
            ? String(pdvSettings.max_discount_percentage)
            : "",
        default_cart_discount_type:
          pdvSettings.default_cart_discount_type || "none",
        default_cart_discount_value:
          pdvSettings.default_cart_discount_value != null
            ? pdvSettings.default_cart_discount_type === "percentage"
              ? String(pdvSettings.default_cart_discount_value)
              : (pdvSettings.default_cart_discount_value / 100).toFixed(2)
            : "",
      });
    }
  }, [pdvSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDefaultDiscountTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      default_cart_discount_type: type,
      default_cart_discount_value: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setJustSaved(false);
    const hasDefaultDiscount = formData.default_cart_discount_type !== "none";
    const result = await onUpdate({
      min_cart_value_in_cents: Math.round(
        Number(formData.min_cart_value_in_cents || 0) * 100,
      ),
      max_discount_in_cents: formData.max_discount_in_cents
        ? Math.round(Number(formData.max_discount_in_cents) * 100)
        : null,
      max_discount_percentage: formData.max_discount_percentage
        ? Math.round(Number(formData.max_discount_percentage))
        : null,
      default_cart_discount_type: hasDefaultDiscount
        ? formData.default_cart_discount_type
        : null,
      default_cart_discount_value: hasDefaultDiscount
        ? formData.default_cart_discount_type === "percentage"
          ? Math.round(Number(formData.default_cart_discount_value || 0))
          : Math.round(Number(formData.default_cart_discount_value || 0) * 100)
        : null,
    });
    if (result) setJustSaved(true);
  };

  if (isLoading || !pdvSettings) {
    return (
      <div className="my-20 border-t border-gray-200 pt-12">
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="my-20 border-t border-gray-200 pt-12">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Configurações do PDV
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Piso do carrinho (R$)
          </label>
          <FormInput
            id="pdv-settings-min-cart"
            name="min_cart_value_in_cents"
            type="number"
            step="0.01"
            min="0"
            value={formData.min_cart_value_in_cents}
            onChange={handleChange}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limite de desconto em R$
            <br />
            (vazio = sem limite)
          </label>
          <FormInput
            id="pdv-settings-max-discount"
            name="max_discount_in_cents"
            type="number"
            step="0.01"
            min="0"
            value={formData.max_discount_in_cents}
            onChange={handleChange}
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limite de desconto em %
            <br />
            (vazio = sem limite)
          </label>
          <FormInput
            id="pdv-settings-max-discount-percentage"
            name="max_discount_percentage"
            type="number"
            step="1"
            min="0"
            max="100"
            value={formData.max_discount_percentage}
            onChange={handleChange}
          />
        </div>
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Desconto padrão do carrinho
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Aplicado quando o vendedor pula a tela de desconto no fechamento da
            venda.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDefaultDiscountTypeChange("none")}
                className={`py-2 px-4 rounded-md border text-sm font-semibold ${
                  formData.default_cart_discount_type === "none"
                    ? "bg-rakusai-purple text-white border-rakusai-purple"
                    : "border-gray-300 text-gray-700"
                }`}
              >
                Nenhum
              </button>
              <button
                type="button"
                onClick={() => handleDefaultDiscountTypeChange("percentage")}
                className={`py-2 px-4 rounded-md border text-sm font-semibold ${
                  formData.default_cart_discount_type === "percentage"
                    ? "bg-rakusai-purple text-white border-rakusai-purple"
                    : "border-gray-300 text-gray-700"
                }`}
              >
                Percentual (%)
              </button>
              <button
                type="button"
                onClick={() => handleDefaultDiscountTypeChange("fixed")}
                className={`py-2 px-4 rounded-md border text-sm font-semibold ${
                  formData.default_cart_discount_type === "fixed"
                    ? "bg-rakusai-purple text-white border-rakusai-purple"
                    : "border-gray-300 text-gray-700"
                }`}
              >
                Valor (R$)
              </button>
            </div>
            {formData.default_cart_discount_type !== "none" && (
              <div className="w-32">
                <FormInput
                  id="pdv-settings-default-discount-value"
                  name="default_cart_discount_value"
                  type="number"
                  step={
                    formData.default_cart_discount_type === "percentage"
                      ? "1"
                      : "0.01"
                  }
                  min="0"
                  max={
                    formData.default_cart_discount_type === "percentage"
                      ? "100"
                      : undefined
                  }
                  placeholder={
                    formData.default_cart_discount_type === "percentage"
                      ? "Ex: 10"
                      : "Ex: 5.00"
                  }
                  value={formData.default_cart_discount_value}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>
        </div>

        <div className="w-full sm:w-auto">
          {justSaved ? (
            <div className="w-full sm:w-40 flex items-center justify-center gap-1 py-2 px-6 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full">
              <FiCheckCircle /> Salvo!
            </div>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="small"
              className="w-full sm:w-40"
            >
              Salvar
            </Button>
          )}
        </div>
        <p className="w-full text-xs text-gray-500 -mt-2">
          Se os dois limites de desconto forem preenchidos, vale o que resultar
          no menor desconto para o carrinho.
        </p>
      </form>
    </div>
  );
}
