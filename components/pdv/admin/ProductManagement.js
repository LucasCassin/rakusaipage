import React, { useState } from "react";
import { FiEdit2, FiTrash2, FiPlus, FiMinus } from "react-icons/fi";
import Button from "components/ui/Button";
import FormInput from "components/forms/FormInput";
import Switch from "components/ui/Switch";
import DeleteConfirmModal from "components/pdv/admin/DeleteConfirmModal";
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
  onCheckInUse,
  onAdjustStock,
}) {
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [stockDeltaByProduct, setStockDeltaByProduct] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const handleConfirmDelete = async () => {
    await onHardDelete(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="my-20 border-t border-gray-200 pt-12">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Produtos do PDV
      </h3>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 mb-6"
      >
        <div className="flex-[2] min-w-[220px]">
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
        <div className="flex-1 min-w-[140px]">
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
        <div className="flex-1 min-w-[140px]">
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
          <div className="flex-1 min-w-[140px]">
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            type="submit"
            variant="primary"
            size="small"
            className="w-full sm:w-40"
          >
            {editingId ? "Salvar" : "+ Criar"}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="w-full sm:w-40"
              onClick={resetForm}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          Nenhum produto cadastrado.
        </p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-2 pr-4 text-left">Nome</th>
                  <th className="py-2 pr-4 text-center">Preço</th>
                  <th className="py-2 pr-4 text-center">Piso Unitário</th>
                  <th className="py-2 pr-4 text-center">Estoque</th>
                  <th className="py-2 pr-4 text-center">Status</th>
                  <th className="py-2 pr-4 text-center">Ajustar estoque</th>
                  <th className="py-2 pr-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="py-2 pr-4 font-medium text-left">
                      {product.name}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {formatCurrencyInCents(product.price_in_cents)}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {formatCurrencyInCents(product.min_unit_price_in_cents)}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {product.stock_quantity}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={product.is_active}
                          onChange={() => handleToggleActive(product)}
                        />
                        <span className="text-gray-700">
                          {product.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          className="w-14 px-2 py-1 border border-gray-300 rounded-full text-sm text-center"
                          value={stockDeltaByProduct[product.id] || ""}
                          onChange={(e) =>
                            setStockDeltaByProduct((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(product.id, 1)}
                          className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                          aria-label="Adicionar ao estoque"
                        >
                          <FiPlus size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(product.id, -1)}
                          className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                          aria-label="Remover do estoque"
                        >
                          <FiMinus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="secondary"
                          size="small"
                          aria-label="Editar"
                          onClick={() => startEdit(product)}
                        >
                          <FiEdit2 />
                          <span className="ml-2 sm:hidden">Editar</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          aria-label="Excluir"
                          onClick={() => setDeleteTarget(product)}
                        >
                          <FiTrash2 />
                          <span className="ml-2 sm:hidden">Excluir</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrencyInCents(product.price_in_cents)} · piso{" "}
                      {formatCurrencyInCents(product.min_unit_price_in_cents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={product.is_active}
                      onChange={() => handleToggleActive(product)}
                    />
                    <span className="text-sm text-gray-700">
                      {product.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3">
                  Estoque:{" "}
                  <span className="font-semibold">
                    {product.stock_quantity}
                  </span>
                </p>

                <div className="flex items-center gap-1.5 mb-3">
                  <input
                    type="number"
                    min="0"
                    className="w-14 px-2 py-1 border border-gray-300 rounded-full text-sm text-center"
                    value={stockDeltaByProduct[product.id] || ""}
                    onChange={(e) =>
                      setStockDeltaByProduct((prev) => ({
                        ...prev,
                        [product.id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => handleStockAdjust(product.id, 1)}
                    className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                    aria-label="Adicionar ao estoque"
                  >
                    <FiPlus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStockAdjust(product.id, -1)}
                    className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                    aria-label="Remover do estoque"
                  >
                    <FiMinus size={14} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    className="flex-1"
                    onClick={() => startEdit(product)}
                  >
                    <FiEdit2 />
                    <span className="ml-2">Editar</span>
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    className="flex-1"
                    onClick={() => setDeleteTarget(product)}
                  >
                    <FiTrash2 />
                    <span className="ml-2">Excluir</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Excluir Produto"
          itemLabel={deleteTarget.name}
          blockedMessage="Este produto já foi vendido e não pode ser excluído. Use o botão de ativar/inativar em vez de excluir."
          safeMessage="Este produto nunca foi vendido e pode ser excluído com segurança."
          onClose={() => setDeleteTarget(null)}
          onDelete={handleConfirmDelete}
          checkUsage={() => onCheckInUse(deleteTarget.id)}
        />
      )}
    </div>
  );
}
