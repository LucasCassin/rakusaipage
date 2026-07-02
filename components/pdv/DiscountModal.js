import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import Button from "components/ui/Button";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";
import {
  calculatePdvDiscount,
  PDV_DISCOUNT_CAP_LABELS,
} from "src/utils/calculatePdvDiscount";

// Prefill sugerido para cada tipo de desconto, a partir dos tetos
// configurados — o vendedor pode sempre digitar outro valor por cima.
function suggestedValue(type, pdvSettings) {
  if (!pdvSettings) return "";
  if (type === "percentage") {
    return pdvSettings.max_discount_percentage != null
      ? String(pdvSettings.max_discount_percentage)
      : "";
  }
  return pdvSettings.max_discount_in_cents != null
    ? (pdvSettings.max_discount_in_cents / 100).toFixed(2)
    : "";
}

export default function DiscountModal({
  subtotalInCents,
  totalMinimumFloorInCents,
  pdvSettings,
  onClose,
  onConfirm,
}) {
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState(() =>
    suggestedValue("percentage", pdvSettings),
  );
  const [wasEdited, setWasEdited] = useState(false);

  // Ao trocar de aba (%/R$) sem o vendedor ter digitado nada ainda, troca o
  // valor sugerido pelo teto correspondente ao novo tipo.
  useEffect(() => {
    if (wasEdited) return;
    setValue(suggestedValue(type, pdvSettings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, pdvSettings]);

  const numericValue = Number(value);
  const hasValidValue =
    value !== "" && !Number.isNaN(numericValue) && numericValue > 0;

  const preview =
    hasValidValue && pdvSettings
      ? calculatePdvDiscount({
          subtotalInCents,
          totalMinimumFloorInCents,
          discountType: type,
          discountValue:
            type === "percentage"
              ? Math.round(numericValue)
              : Math.round(numericValue * 100),
          settings: pdvSettings,
        })
      : null;

  const handleSkip = () => {
    onConfirm(null, null);
  };

  const handleApply = () => {
    if (!hasValidValue) {
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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50"
      style={{ margin: 0 }}
    >
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
            onClick={() => {
              setType("percentage");
              setWasEdited(false);
            }}
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
            onClick={() => {
              setType("fixed");
              setWasEdited(false);
            }}
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
          max={type === "percentage" ? "100" : undefined}
          step={type === "percentage" ? "1" : "0.01"}
          value={value}
          onChange={(e) => {
            setWasEdited(true);
            setValue(e.target.value);
          }}
          placeholder={type === "percentage" ? "Ex: 10" : "Ex: 5.00"}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-rakusai-purple focus:border-rakusai-purple sm:text-sm"
        />

        {preview && (
          <div className="mt-2 mb-6 text-sm">
            <p className="text-gray-700">
              Total com desconto:{" "}
              <strong>
                {formatCurrencyInCents(
                  subtotalInCents - preview.discountInCents,
                )}
              </strong>
            </p>
            {preview.cappedBy && (
              <p className="mt-1 text-xs text-amber-700">
                Desconto limitado {PDV_DISCOUNT_CAP_LABELS[preview.cappedBy]}.
              </p>
            )}
          </div>
        )}
        {!preview && <div className="mb-6" />}

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
