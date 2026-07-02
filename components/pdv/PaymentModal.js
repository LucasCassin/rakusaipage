import React, { useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import { FaCalculator } from "react-icons/fa";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

/**
 * Divide `remainingInCents` igualmente entre `ids`, distribuindo o resto de
 * arredondamento (em centavos) entre os primeiros da lista, para que a soma
 * bata exatamente com o valor a dividir.
 */
function splitEvenly(ids, remainingInCents) {
  if (ids.length === 0) return {};
  const base = Math.floor(remainingInCents / ids.length);
  let leftover = remainingInCents - base * ids.length;

  const amounts = {};
  for (const id of ids) {
    amounts[id] = base + (leftover > 0 ? 1 : 0);
    if (leftover > 0) leftover--;
  }
  return amounts;
}

/**
 * Calcula o valor de cada forma de pagamento selecionada: as que já foram
 * editadas manualmente mantêm o valor digitado; o restante do total é
 * dividido igualmente entre as que ainda não foram editadas.
 */
function computeAmounts(selectedIds, manualAmountsInCents, totalInCents) {
  const manualIds = selectedIds.filter((id) =>
    Object.prototype.hasOwnProperty.call(manualAmountsInCents, id),
  );
  const autoIds = selectedIds.filter(
    (id) => !Object.prototype.hasOwnProperty.call(manualAmountsInCents, id),
  );

  const manualSum = manualIds.reduce(
    (acc, id) => acc + manualAmountsInCents[id],
    0,
  );
  const remaining = Math.max(0, totalInCents - manualSum);

  const amounts = { ...manualAmountsInCents };
  Object.assign(amounts, splitEvenly(autoIds, remaining));
  return { amounts, autoIds, manualSum };
}

export default function PaymentModal({
  totalInCents,
  discountCapMessage,
  paymentMethods,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [manualInputs, setManualInputs] = useState({});
  const [variantByMethodId, setVariantByMethodId] = useState({});
  const [cashGivenInputs, setCashGivenInputs] = useState({});
  const [openCalculatorFor, setOpenCalculatorFor] = useState({});
  const [notes, setNotes] = useState("");

  const methodsById = useMemo(
    () => Object.fromEntries(paymentMethods.map((pm) => [pm.id, pm])),
    [paymentMethods],
  );

  const manualAmountsInCents = useMemo(() => {
    const result = {};
    for (const id of Object.keys(manualInputs)) {
      const cents = Math.round(Number(manualInputs[id]) * 100);
      result[id] = Number.isFinite(cents) ? cents : 0;
    }
    return result;
  }, [manualInputs]);

  const { amounts, autoIds } = useMemo(
    () => computeAmounts(selectedIds, manualAmountsInCents, totalInCents),
    [selectedIds, manualAmountsInCents, totalInCents],
  );

  const toggleMethod = (methodId) => {
    setSelectedIds((prev) => {
      const isSelected = prev.includes(methodId);
      if (isSelected) {
        setManualInputs((inputs) => {
          const next = { ...inputs };
          delete next[methodId];
          return next;
        });
        setVariantByMethodId((variants) => {
          const next = { ...variants };
          delete next[methodId];
          return next;
        });
        setCashGivenInputs((cash) => {
          const next = { ...cash };
          delete next[methodId];
          return next;
        });
        setOpenCalculatorFor((open) => {
          const next = { ...open };
          delete next[methodId];
          return next;
        });
        return prev.filter((id) => id !== methodId);
      }
      return [...prev, methodId];
    });
    // Selecionar/desselecionar uma forma redivide tudo igualmente de novo.
    setManualInputs({});
  };

  const handleAmountChange = (methodId, value) => {
    if (value.trim() === "") {
      setManualInputs((prev) => {
        const next = { ...prev };
        delete next[methodId];
        return next;
      });
      return;
    }
    setManualInputs((prev) => ({ ...prev, [methodId]: value }));
  };

  const sumAllocatedInCents = selectedIds.reduce(
    (acc, id) => acc + (amounts[id] || 0),
    0,
  );
  const sumMatchesTotal = sumAllocatedInCents === totalInCents;

  const variantsOk = selectedIds.every((id) => {
    const method = methodsById[id];
    const hasActiveVariants = method.variants.some((v) => v.is_active);
    return !hasActiveVariants || Boolean(variantByMethodId[id]);
  });

  const cashGivenOk = selectedIds.every((id) => {
    const raw = cashGivenInputs[id];
    if (!raw) return true;
    const cents = Math.round(Number(raw) * 100);
    return Number.isFinite(cents) && cents >= amounts[id];
  });

  const canConfirm =
    selectedIds.length > 0 &&
    sumMatchesTotal &&
    variantsOk &&
    cashGivenOk &&
    !isSubmitting;

  const handleConfirm = () => {
    if (!canConfirm) return;

    const payments = selectedIds.map((id) => {
      const rawCashGiven = cashGivenInputs[id];
      const cashGivenInCents = rawCashGiven
        ? Math.round(Number(rawCashGiven) * 100)
        : null;

      return {
        paymentMethodId: id,
        paymentMethodVariantId: variantByMethodId[id] || null,
        amountInCents: amounts[id],
        cashGivenInCents,
      };
    });

    onConfirm({ payments, notes: notes.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-3">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Forma de Pagamento</h3>
          <button onClick={onClose} disabled={isSubmitting}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <p className="text-center text-2xl font-bold text-rakusai-purple mb-1">
          {formatCurrencyInCents(totalInCents)}
        </p>
        {discountCapMessage && (
          <p className="text-center text-xs text-amber-700 mb-3">
            {discountCapMessage}
          </p>
        )}

        <p className="text-sm text-gray-600 mb-2">
          Selecione uma ou mais formas de pagamento para dividir a venda.
        </p>

        <div className="flex flex-col gap-3 mb-4">
          {paymentMethods.map((method) => {
            const isSelected = selectedIds.includes(method.id);
            const isManual = Object.prototype.hasOwnProperty.call(
              manualInputs,
              method.id,
            );
            const isEditable = isManual || autoIds.length > 1;
            const activeVariants = method.variants.filter((v) => v.is_active);
            const amountInCents = amounts[method.id] || 0;
            const cashGiven = cashGivenInputs[method.id] || "";
            const cashGivenInCents = cashGiven
              ? Math.round(Number(cashGiven) * 100)
              : null;
            const change =
              cashGivenInCents !== null
                ? Math.max(0, cashGivenInCents - amountInCents)
                : null;

            return (
              <div
                key={method.id}
                className={`border rounded-md p-3 ${
                  isSelected
                    ? "border-rakusai-purple bg-rakusai-purple/5"
                    : "border-gray-200"
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMethod(method.id)}
                  />
                  <span className="font-semibold text-sm text-gray-900">
                    {method.name}
                  </span>
                </label>

                {isSelected && (
                  <div className="mt-3 pl-6 flex flex-col gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Valor
                      </label>
                      {isEditable ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            isManual
                              ? manualInputs[method.id]
                              : (amountInCents / 100).toFixed(2)
                          }
                          onChange={(e) =>
                            handleAmountChange(method.id, e.target.value)
                          }
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-rakusai-purple focus:border-rakusai-purple"
                        />
                      ) : (
                        <p className="px-3 py-1.5 bg-gray-100 rounded-md text-sm font-semibold text-gray-700">
                          {formatCurrencyInCents(amountInCents)}{" "}
                          <span className="font-normal text-gray-400">
                            (restante)
                          </span>
                        </p>
                      )}
                    </div>

                    {activeVariants.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          Qual máquina/variante?
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {activeVariants.map((variant) => (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() =>
                                setVariantByMethodId((prev) => ({
                                  ...prev,
                                  [method.id]: variant.id,
                                }))
                              }
                              className={`py-1 px-3 rounded-full border text-xs font-semibold ${
                                variantByMethodId[method.id] === variant.id
                                  ? "bg-gray-800 text-white border-gray-800"
                                  : "border-gray-300 text-gray-700"
                              }`}
                            >
                              {variant.name}
                            </button>
                          ))}
                        </div>
                        {!variantByMethodId[method.id] && (
                          <p className="mt-1 text-xs text-gray-500">
                            Escolha uma variante para continuar.
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenCalculatorFor((prev) => ({
                            ...prev,
                            [method.id]: !prev[method.id],
                          }))
                        }
                        className="inline-flex items-center gap-2 text-xs font-medium text-rakusai-purple hover:text-rakusai-purple-light"
                        aria-expanded={Boolean(openCalculatorFor[method.id])}
                      >
                        <FaCalculator className="h-3.5 w-3.5" />
                        Calculadora de troco
                      </button>

                      {openCalculatorFor[method.id] && (
                        <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Valor recebido em dinheiro
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cashGiven}
                            onChange={(e) =>
                              setCashGivenInputs((prev) => ({
                                ...prev,
                                [method.id]: e.target.value,
                              }))
                            }
                            placeholder="Ex: 50.00"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-rakusai-purple focus:border-rakusai-purple"
                          />
                          {change !== null && (
                            <p className="mt-2 text-sm font-semibold text-gray-800">
                              Troco: {formatCurrencyInCents(change)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedIds.length > 0 && !sumMatchesTotal && (
          <Alert type="error">
            A soma dos valores ({formatCurrencyInCents(sumAllocatedInCents)})
            não bate com o total da venda ({formatCurrencyInCents(totalInCents)}
            ).
          </Alert>
        )}

        <div className="mb-4 mt-4">
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
            disabled={!canConfirm}
          >
            {isSubmitting ? "Confirmando..." : "Confirmar Venda"}
          </Button>
        </div>
      </div>
    </div>
  );
}
