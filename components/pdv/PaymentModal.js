import React, { useState, useMemo } from "react";
import { FiX } from "react-icons/fi";
import { FaCalculator } from "react-icons/fa";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

export default function PaymentModal({
  totalInCents,
  paymentMethods,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}) {
  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const [variantId, setVariantId] = useState(null);
  const [cashGiven, setCashGiven] = useState("");
  const [notes, setNotes] = useState("");
  const [showChangeCalculator, setShowChangeCalculator] = useState(false);

  const selectedMethod = useMemo(
    () => paymentMethods.find((pm) => pm.id === paymentMethodId),
    [paymentMethods, paymentMethodId],
  );

  const activeVariants = useMemo(
    () =>
      selectedMethod?.variants?.filter((variant) => variant.is_active) ?? [],
    [selectedMethod],
  );
  const requiresVariant = activeVariants.length > 0;

  const cashGivenInCents = cashGiven
    ? Math.round(Number(cashGiven) * 100)
    : null;
  const change =
    cashGivenInCents !== null
      ? Math.max(0, cashGivenInCents - totalInCents)
      : null;

  const canConfirm =
    Boolean(paymentMethodId) &&
    (!requiresVariant || Boolean(variantId)) &&
    (!cashGiven || cashGivenInCents >= totalInCents);

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      paymentMethodId,
      paymentMethodVariantId: variantId,
      cashGivenInCents,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-3">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Forma de Pagamento</h3>
          <button onClick={onClose} disabled={isSubmitting}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <p className="text-center text-2xl font-bold text-rakusai-purple mb-4">
          {formatCurrencyInCents(totalInCents)}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => {
                setPaymentMethodId(method.id);
                setVariantId(null);
              }}
              className={`py-2 px-3 rounded-md border text-sm font-semibold ${
                paymentMethodId === method.id
                  ? "bg-rakusai-purple text-white border-rakusai-purple"
                  : "border-gray-300 text-gray-700"
              }`}
            >
              {method.name}
            </button>
          ))}
        </div>

        {requiresVariant && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Qual máquina/variante?
            </p>
            <div className="flex flex-wrap gap-2">
              {activeVariants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setVariantId(variant.id)}
                  className={`py-1 px-3 rounded-full border text-xs font-semibold ${
                    variantId === variant.id
                      ? "bg-gray-800 text-white border-gray-800"
                      : "border-gray-300 text-gray-700"
                  }`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
            {!variantId && (
              <p className="mt-1 text-xs text-gray-500">
                Escolha uma variante para continuar.
              </p>
            )}
          </div>
        )}

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowChangeCalculator((prev) => !prev)}
            className="inline-flex items-center gap-2 text-sm font-medium text-rakusai-purple hover:text-rakusai-purple-light"
            aria-expanded={showChangeCalculator}
          >
            <FaCalculator className="h-4 w-4" />
            Calculadora de troco
          </button>

          {showChangeCalculator && (
            <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor recebido em dinheiro
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashGiven}
                onChange={(e) => setCashGiven(e.target.value)}
                placeholder="Ex: 50.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-rakusai-purple focus:border-rakusai-purple sm:text-sm"
              />
              {change !== null && (
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  Troco: {formatCurrencyInCents(change)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observação (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex: nome e telefone para sorteio"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-rakusai-purple focus:border-rakusai-purple sm:text-sm"
          />
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3 sm:gap-0 mt-4">
          <Button
            variant="secondary"
            size="small"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Voltar
          </Button>
          <Button
            variant="primary"
            size="small"
            className="w-full sm:w-auto"
            onClick={handleConfirm}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting ? "Confirmando..." : "Confirmar Venda"}
          </Button>
        </div>
      </div>
    </div>
  );
}
