import React, { useState, useEffect } from "react";
import { FiCheckCircle } from "react-icons/fi";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";

export default function SettingsForm({ pdvSettings, isLoading, onUpdate }) {
  const [formData, setFormData] = useState({
    min_cart_value_in_cents: "0",
    max_discount_in_cents: "",
    max_discount_percentage: "",
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
      });
    }
  }, [pdvSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setJustSaved(false);
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

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end w-full"
      >
        <div>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teto de desconto em R$ (vazio = sem limite)
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teto de desconto em % (vazio = sem limite)
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
        <div>
          {justSaved ? (
            <div className="w-full flex items-center justify-center gap-1 py-2 px-6 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full">
              <FiCheckCircle /> Salvo!
            </div>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="small"
              className="w-full"
            >
              Salvar
            </Button>
          )}
        </div>
        <p className="sm:col-span-2 lg:col-span-4 text-xs text-gray-500 -mt-2">
          Se os dois tetos de desconto forem preenchidos, vale o que resultar no
          menor desconto para o carrinho.
        </p>
      </form>
    </div>
  );
}
