import React from "react";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

const PaletteCard = React.memo(({ product, onClick }) => {
  const outOfStock =
    !product.allow_negative_stock && product.stock_quantity <= 0;

  return (
    <button
      type="button"
      onClick={() => onClick(product)}
      disabled={outOfStock}
      className="flex flex-col items-start p-4 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-rakusai-purple transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className="font-semibold text-gray-900">{product.name}</span>
      <span className="mt-1 text-lg font-bold text-rakusai-purple">
        {formatCurrencyInCents(product.price_in_cents)}
      </span>
      <span className="mt-1 text-xs text-gray-500">
        {outOfStock ? "Sem estoque" : `Estoque: ${product.stock_quantity}`}
      </span>
    </button>
  );
});

PaletteCard.displayName = "PaletteCard";

export default PaletteCard;
