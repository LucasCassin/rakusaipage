import React, { useMemo, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import PaymentEntryRow from "components/pdv/PaymentEntryRow";
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
 * Calcula o valor de cada parcela do pool: as que já foram editadas
 * manualmente mantêm o valor digitado; o restante do total é dividido
 * igualmente entre as que ainda não foram editadas.
 */
function computeAmounts(entryIds, manualAmountsInCents, totalInCents) {
  const manualIds = entryIds.filter((id) =>
    Object.prototype.hasOwnProperty.call(manualAmountsInCents, id),
  );
  const autoIds = entryIds.filter(
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
  const nextLocalIdRef = useRef(0);
  const [entries, setEntries] = useState([]);
  const [manualInputs, setManualInputs] = useState({});
  const [cashGivenInputs, setCashGivenInputs] = useState({});
  const [openCalculatorFor, setOpenCalculatorFor] = useState({});
  const [expandedMethodId, setExpandedMethodId] = useState(null);
  const [notes, setNotes] = useState("");

  const methodsById = useMemo(
    () => Object.fromEntries(paymentMethods.map((pm) => [pm.id, pm])),
    [paymentMethods],
  );

  const manualAmountsInCents = useMemo(() => {
    const result = {};
    for (const localId of Object.keys(manualInputs)) {
      const cents = Math.round(Number(manualInputs[localId]) * 100);
      result[localId] = Number.isFinite(cents) ? cents : 0;
    }
    return result;
  }, [manualInputs]);

  const entryIds = useMemo(
    () => entries.map((entry) => String(entry.localId)),
    [entries],
  );

  const { amounts, autoIds } = useMemo(
    () => computeAmounts(entryIds, manualAmountsInCents, totalInCents),
    [entryIds, manualAmountsInCents, totalInCents],
  );

  const addEntry = (methodId, variantId = null) => {
    nextLocalIdRef.current += 1;
    const localId = nextLocalIdRef.current;
    setEntries((prev) => [...prev, { localId, methodId, variantId }]);
    // Adicionar uma parcela redivide tudo igualmente de novo.
    setManualInputs({});
  };

  const removeEntry = (localId) => {
    setEntries((prev) => prev.filter((entry) => entry.localId !== localId));
    setManualInputs({});
    setCashGivenInputs((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
    setOpenCalculatorFor((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  };

  const handleMethodClick = (method) => {
    const activeVariants = method.variants.filter((v) => v.is_active);
    if (activeVariants.length === 0) {
      addEntry(method.id, null);
      return;
    }
    // Com uma única variante ativa não há escolha a fazer — adiciona direto
    // em vez de exigir um segundo toque na variante.
    if (activeVariants.length === 1) {
      addEntry(method.id, activeVariants[0].id);
      return;
    }
    setExpandedMethodId((prev) => (prev === method.id ? null : method.id));
  };

  const handleVariantClick = (methodId, variantId) => {
    addEntry(methodId, variantId);
  };

  const handleAmountChange = (localId, value) => {
    if (value.trim() === "") {
      setManualInputs((prev) => {
        const next = { ...prev };
        delete next[localId];
        return next;
      });
      return;
    }
    setManualInputs((prev) => ({ ...prev, [localId]: value }));
  };

  const sumAllocatedInCents = entryIds.reduce(
    (acc, id) => acc + (amounts[id] || 0),
    0,
  );
  const sumMatchesTotal = sumAllocatedInCents === totalInCents;
  const remainingInCents = Math.max(0, totalInCents - sumAllocatedInCents);

  const cashGivenOk = entries.every((entry) => {
    const raw = cashGivenInputs[entry.localId];
    if (!raw) return true;
    const cents = Math.round(Number(raw) * 100);
    return Number.isFinite(cents) && cents >= amounts[String(entry.localId)];
  });

  const canConfirm =
    entries.length > 0 && sumMatchesTotal && cashGivenOk && !isSubmitting;

  const handleConfirm = () => {
    if (!canConfirm) return;

    const groups = new Map();
    for (const entry of entries) {
      const key = `${entry.methodId}|${entry.variantId || ""}`;
      const amountInCents = amounts[String(entry.localId)] || 0;
      const rawCashGiven = cashGivenInputs[entry.localId];
      const cashGivenInCents = rawCashGiven
        ? Math.round(Number(rawCashGiven) * 100)
        : null;

      const existing = groups.get(key);
      if (existing) {
        existing.amountInCents += amountInCents;
        existing.cashGivenInCents += cashGivenInCents ?? amountInCents;
        existing.hasCashGiven =
          existing.hasCashGiven || cashGivenInCents !== null;
      } else {
        groups.set(key, {
          paymentMethodId: entry.methodId,
          paymentMethodVariantId: entry.variantId || null,
          amountInCents,
          cashGivenInCents: cashGivenInCents ?? amountInCents,
          hasCashGiven: cashGivenInCents !== null,
        });
      }
    }

    const payments = Array.from(groups.values()).map((group) => ({
      paymentMethodId: group.paymentMethodId,
      paymentMethodVariantId: group.paymentMethodVariantId,
      amountInCents: group.amountInCents,
      cashGivenInCents: group.hasCashGiven ? group.cashGivenInCents : null,
    }));

    onConfirm({ payments, notes: notes.trim() || undefined });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-3"
      style={{ margin: 0 }}
    >
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
          Toque em uma forma de pagamento para adicionar uma parcela à venda.
          Toque quantas vezes for preciso para dividir em mais parcelas.
        </p>

        <div className="flex flex-col gap-2 mb-4">
          {paymentMethods.map((method) => {
            const activeVariants = method.variants.filter((v) => v.is_active);
            const isExpanded = expandedMethodId === method.id;
            const countForMethod = entries.filter(
              (entry) => entry.methodId === method.id,
            ).length;

            return (
              <div
                key={method.id}
                className={`border rounded-md p-3 ${
                  isExpanded
                    ? "border-rakusai-purple bg-rakusai-purple/5"
                    : "border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleMethodClick(method)}
                  className="w-full flex items-center justify-between"
                >
                  <span className="font-semibold text-sm text-gray-900">
                    {method.name}
                  </span>
                  {countForMethod > 0 && (
                    <span className="text-xs font-semibold bg-rakusai-purple/10 text-rakusai-purple rounded-full px-2 py-0.5">
                      {countForMethod}x
                    </span>
                  )}
                </button>

                {activeVariants.length > 0 && isExpanded && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeVariants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() =>
                          handleVariantClick(method.id, variant.id)
                        }
                        className="py-1 px-3 rounded-full border text-xs font-semibold border-gray-300 text-gray-700 hover:border-rakusai-purple hover:text-rakusai-purple"
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {entries.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Alocado: {formatCurrencyInCents(sumAllocatedInCents)}</span>
              <span
                className={sumMatchesTotal ? "text-gray-700" : "text-red-600"}
              >
                Falta: {formatCurrencyInCents(remainingInCents)}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {entries.map((entry) => {
                const method = methodsById[entry.methodId];
                const variant = entry.variantId
                  ? method.variants.find((v) => v.id === entry.variantId)
                  : null;
                const localIdKey = String(entry.localId);
                const isManual = Object.prototype.hasOwnProperty.call(
                  manualInputs,
                  localIdKey,
                );
                const isEditable = isManual || autoIds.length > 1;
                const amountInCents = amounts[localIdKey] || 0;

                return (
                  <PaymentEntryRow
                    key={entry.localId}
                    methodName={method.name}
                    variantName={variant ? variant.name : null}
                    amountInCents={amountInCents}
                    isEditable={isEditable}
                    manualValue={
                      isManual ? manualInputs[localIdKey] : undefined
                    }
                    onAmountChange={(value) =>
                      handleAmountChange(localIdKey, value)
                    }
                    cashGivenValue={cashGivenInputs[entry.localId] || ""}
                    onCashGivenChange={(value) =>
                      setCashGivenInputs((prev) => ({
                        ...prev,
                        [entry.localId]: value,
                      }))
                    }
                    calculatorOpen={Boolean(openCalculatorFor[entry.localId])}
                    onToggleCalculator={() =>
                      setOpenCalculatorFor((prev) => ({
                        ...prev,
                        [entry.localId]: !prev[entry.localId],
                      }))
                    }
                    onRemove={() => removeEntry(entry.localId)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {entries.length > 0 && !sumMatchesTotal && (
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
