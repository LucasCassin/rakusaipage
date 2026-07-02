import React from "react";
import { FiTrash2, FiPlus, FiMinus } from "react-icons/fi";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

const CartItemRow = React.memo(
  ({ item, onIncrement, onDecrement, onRemove }) => {
    return (
      <div className="flex items-center justify-between gap-2 py-2 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{item.name}</p>
          <p className="text-sm text-gray-500">
            {formatCurrencyInCents(item.unit_price_in_cents)} un.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDecrement(item.product_id)}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
            aria-label="Diminuir quantidade"
          >
            <FiMinus size={14} />
          </button>
          <span className="w-6 text-center font-semibold">{item.quantity}</span>
          <button
            type="button"
            onClick={() => onIncrement(item.product_id)}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
            aria-label="Aumentar quantidade"
          >
            <FiPlus size={14} />
          </button>
        </div>

        <p className="w-20 text-right font-semibold text-gray-900">
          {formatCurrencyInCents(item.unit_price_in_cents * item.quantity)}
        </p>

        <button
          type="button"
          onClick={() => onRemove(item.product_id)}
          className="p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700"
          aria-label="Remover item"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    );
  },
);

CartItemRow.displayName = "CartItemRow";

export default CartItemRow;
