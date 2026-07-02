import React from "react";
import CartItemRow from "components/pdv/CartItemRow";
import Button from "components/ui/Button";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

export default function Cart({
  items,
  subtotalInCents,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
}) {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-2">Carrinho</h3>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            Clique em um produto para adicionar ao carrinho.
          </p>
        ) : (
          items.map((item) => (
            <CartItemRow
              key={item.product_id}
              item={item}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-lg font-bold text-gray-900 mb-4">
          <span>Subtotal</span>
          <span>{formatCurrencyInCents(subtotalInCents)}</span>
        </div>
        <Button
          variant="primary"
          className="w-full"
          disabled={items.length === 0}
          onClick={onCheckout}
        >
          Fechar Venda
        </Button>
      </div>
    </div>
  );
}
