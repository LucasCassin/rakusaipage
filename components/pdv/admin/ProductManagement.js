import React, { useState } from "react";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Switch from "components/ui/Switch";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

const emptyForm = {
  name: "",
  price_in_cents: "",
  min_unit_price_in_cents: "0",
  initial_stock_quantity: "0",
  allow_negative_stock: false,
  max_negative_stock: "",
};

export default function ProductManagement({
  products,
  isLoading,
  onCreate,
  onUpdate,
  onRemove,
  onHardDelete,
  onAdjustStock,
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [stockDeltaByProduct, setStockDeltaByProduct] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      price_in_cents: Math.round(Number(formData.price_in_cents) * 100),
      min_unit_price_in_cents: Math.round(
        Number(formData.min_unit_price_in_cents || 0) * 100,
      ),
      allow_negative_stock: formData.allow_negative_stock,
      max_negative_stock: formData.max_negative_stock
        ? Number(formData.max_negative_stock)
        : null,
    };

    const result = editingId
      ? await onUpdate(editingId, payload)
      : await onCreate({
          ...payload,
          stock_quantity: Number(formData.initial_stock_quantity || 0),
        });

    if (result) resetForm();
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      price_in_cents: (product.price_in_cents / 100).toFixed(2),
      min_unit_price_in_cents: (product.min_unit_price_in_cents / 100).toFixed(
        2,
      ),
      initial_stock_quantity: "0",
      allow_negative_stock: product.allow_negative_stock,
      max_negative_stock: product.max_negative_stock ?? "",
    });
  };

  const handleStockAdjust = (productId, sign) => {
    const rawDelta = Number(stockDeltaByProduct[productId] || 0);
    if (!rawDelta) return;
    onAdjustStock(productId, sign * rawDelta);
    setStockDeltaByProduct((prev) => ({ ...prev, [productId]: "" }));
  };

  const handleToggleActive = (product) => {
    if (product.is_active) {
      onRemove(product.id);
    } else {
      onUpdate(product.id, { is_active: true });
    }
  };

  const handleHardDelete = (product) => {
    if (
      window.confirm(
        `Excluir definitivamente o produto "${product.name}"? Esta ação não pode ser desfeita e só é possível se ele nunca foi vendido.`,
      )
    ) {
      onHardDelete(product.id);
    }
  };

  return (
    <div className="my-20 border-t border-gray-200 pt-12">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Produtos do PDV
      </h3>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 items-end"
      >
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome
          </label>
          <FormInput
            id="pdv-product-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preço (R$)
          </label>
          <FormInput
            id="pdv-product-price"
            name="price_in_cents"
            type="number"
            step="0.01"
            min="0"
            value={formData.price_in_cents}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Piso unitário (R$)
          </label>
          <FormInput
            id="pdv-product-min-price"
            name="min_unit_price_in_cents"
            type="number"
            step="0.01"
            min="0"
            value={formData.min_unit_price_in_cents}
            onChange={handleChange}
          />
        </div>
        {!editingId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estoque inicial
            </label>
            <FormInput
              id="pdv-product-initial-stock"
              name="initial_stock_quantity"
              type="number"
              step="1"
              min="0"
              value={formData.initial_stock_quantity}
              onChange={handleChange}
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="small">
            {editingId ? "Salvar" : "+ Criar"}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={resetForm}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">Nome</th>
                <th className="py-2 pr-4">Preço</th>
                <th className="py-2 pr-4">Estoque</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Ajustar estoque</th>
                <th className="py-2 pr-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="py-2 pr-4 font-medium">{product.name}</td>
                  <td className="py-2 pr-4">
                    {formatCurrencyInCents(product.price_in_cents)}
                  </td>
                  <td className="py-2 pr-4">{product.stock_quantity}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.is_active}
                        onChange={() => handleToggleActive(product)}
                      />
                      <span
                        className={
                          product.is_active ? "text-green-700" : "text-gray-400"
                        }
                      >
                        {product.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                        value={stockDeltaByProduct[product.id] || ""}
                        onChange={(e) =>
                          setStockDeltaByProduct((prev) => ({
                            ...prev,
                            [product.id]: e.target.value,
                          }))
                        }
                      />
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleStockAdjust(product.id, 1)}
                      >
                        +
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleStockAdjust(product.id, -1)}
                      >
                        -
                      </Button>
                    </div>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <Button
                        variant="link"
                        size="small"
                        onClick={() => startEdit(product)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="link"
                        size="small"
                        className="text-red-600"
                        onClick={() => handleHardDelete(product)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Nenhum produto cadastrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
