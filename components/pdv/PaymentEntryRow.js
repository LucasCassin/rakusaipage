import React from "react";
import { FiTrash2 } from "react-icons/fi";
import { FaCalculator } from "react-icons/fa";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

const PaymentEntryRow = React.memo(
  ({
    methodName,
    variantName,
    amountInCents,
    isEditable,
    manualValue,
    onAmountChange,
    cashGivenValue,
    onCashGivenChange,
    calculatorOpen,
    onToggleCalculator,
    onRemove,
  }) => {
    const cashGivenInCents = cashGivenValue
      ? Math.round(Number(cashGivenValue) * 100)
      : null;
    const change =
      cashGivenInCents !== null
        ? Math.max(0, cashGivenInCents - amountInCents)
        : null;

    return (
      <div className="border border-gray-200 rounded-md p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm text-gray-900">{methodName}</p>
            {variantName && (
              <p className="text-xs text-gray-500">{variantName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700"
            aria-label="Remover parcela"
          >
            <FiTrash2 size={16} />
          </button>
        </div>

        <div className="mt-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Valor
          </label>
          {isEditable ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={
                manualValue !== undefined
                  ? manualValue
                  : (amountInCents / 100).toFixed(2)
              }
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-rakusai-purple focus:border-rakusai-purple"
            />
          ) : (
            <p className="px-3 py-1.5 bg-gray-100 rounded-md text-sm font-semibold text-gray-700">
              {formatCurrencyInCents(amountInCents)}{" "}
              <span className="font-normal text-gray-400">(restante)</span>
            </p>
          )}
        </div>

        <div className="mt-2">
          <button
            type="button"
            onClick={onToggleCalculator}
            className="inline-flex items-center gap-2 text-xs font-medium text-rakusai-purple hover:text-rakusai-purple-light"
            aria-expanded={calculatorOpen}
          >
            <FaCalculator className="h-3.5 w-3.5" />
            Calculadora de troco
          </button>

          {calculatorOpen && (
            <div className="mt-2 p-3 border border-gray-200 rounded-md bg-gray-50">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Valor recebido em dinheiro
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashGivenValue}
                onChange={(e) => onCashGivenChange(e.target.value)}
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
    );
  },
);

PaymentEntryRow.displayName = "PaymentEntryRow";

export default PaymentEntryRow;
