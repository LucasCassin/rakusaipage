import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import Button from "components/ui/Button";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

export default function DiscountModal({ subtotalInCents, onClose, onConfirm }) {
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("");

  const handleSkip = () => {
    onConfirm(null, null);
  };

  const handleApply = () => {
    const numericValue = Number(value);
    if (!value || Number.isNaN(numericValue) || numericValue <= 0) {
      onConfirm(null, null);
      return;
    }
    // "percentual" é enviado como inteiro (ex: 10 = 10%); "valor fixo" é
    // convertido de reais para centavos, que é o que a API espera.
    const preparedValue =
      type === "percentage"
        ? Math.round(numericValue)
        : Math.round(numericValue * 100);
    onConfirm(type, preparedValue);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 mx-3">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Desconto</h3>
          <button onClick={onClose}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Subtotal: <strong>{formatCurrencyInCents(subtotalInCents)}</strong>
        </p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setType("percentage")}
            className={`flex-1 py-2 rounded-md border text-sm font-semibold ${
              type === "percentage"
                ? "bg-rakusai-purple text-white border-rakusai-purple"
                : "border-gray-300 text-gray-700"
            }`}
          >
            Percentual (%)
          </button>
          <button
            type="button"
            onClick={() => setType("fixed")}
            className={`flex-1 py-2 rounded-md border text-sm font-semibold ${
              type === "fixed"
                ? "bg-rakusai-purple text-white border-rakusai-purple"
                : "border-gray-300 text-gray-700"
            }`}
          >
            Valor (R$)
          </button>
        </div>

        <input
          type="number"
          min="0"
          step={type === "percentage" ? "1" : "0.01"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === "percentage" ? "Ex: 10" : "Ex: 5.00"}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-rakusai-purple focus:border-rakusai-purple sm:text-sm mb-6"
        />

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3 sm:gap-0">
          <Button
            variant="secondary"
            size="small"
            className="w-full sm:w-auto"
            onClick={handleSkip}
          >
            Sem Desconto
          </Button>
          <Button
            variant="primary"
            size="small"
            className="w-full sm:w-auto"
            onClick={handleApply}
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}
