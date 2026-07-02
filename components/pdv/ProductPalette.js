import React, { useState, useMemo } from "react";
import PaletteCard from "components/pdv/PaletteCard";

export default function ProductPalette({ products, onAddItem }) {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const activeProducts = products.filter((product) => product.is_active);
    if (!search.trim()) return activeProducts;
    const term = search.trim().toLowerCase();
    return activeProducts.filter((product) =>
      product.name.toLowerCase().includes(term),
    );
  }, [products, search]);

  return (
    <div className="flex flex-col h-full">
      <input
        type="text"
        placeholder="Buscar produto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-rakusai-purple focus:border-rakusai-purple sm:text-sm"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto pr-1">
        {filteredProducts.length === 0 && (
          <p className="col-span-full text-center text-gray-500 py-8">
            Nenhum produto encontrado.
          </p>
        )}
        {filteredProducts.map((product) => (
          <PaletteCard key={product.id} product={product} onClick={onAddItem} />
        ))}
      </div>
    </div>
  );
}
