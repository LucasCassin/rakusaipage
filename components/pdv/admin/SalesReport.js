import React, { useState } from "react";
import Button from "components/ui/Button";
import ProductMultiSelectFilter from "components/pdv/admin/ProductMultiSelectFilter";
import SalesBreakdownChart from "components/pdv/admin/SalesBreakdownChart";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

const emptyFilters = {
  start_date: "",
  end_date: "",
  payment_method_id: "",
  product_ids: [],
  include_cancelled: false,
};

export default function SalesReport({
  report,
  isLoading,
  products,
  paymentMethods,
  canCancel,
  onFetch,
  onCancelSale,
}) {
  const [filters, setFilters] = useState(emptyFilters);
  const [cancelReasonBySale, setCancelReasonBySale] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleProductSelect = (selected) => {
    setFilters((prev) => ({ ...prev, product_ids: selected }));
  };

  const buildReportQuery = () => ({
    ...filters,
    product_ids: filters.product_ids.join(","),
    start_date: filters.start_date
      ? new Date(filters.start_date).toISOString()
      : "",
    end_date: filters.end_date ? new Date(filters.end_date).toISOString() : "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onFetch(buildReportQuery());
  };

  const handleCancel = async (saleId) => {
    const result = await onCancelSale(saleId, cancelReasonBySale[saleId] || "");
    setCancelReasonBySale((prev) => ({ ...prev, [saleId]: "" }));
    // Atualiza a tabela com os mesmos filtros para refletir o cancelamento.
    if (result) onFetch(buildReportQuery());
  };

  return (
    <div className="my-20 border-t border-gray-200 pt-12">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Relatório de Vendas
      </h3>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6 items-end"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Início
          </label>
          <input
            type="datetime-local"
            name="start_date"
            value={filters.start_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fim
          </label>
          <input
            type="datetime-local"
            name="end_date"
            value={filters.end_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Forma de pagamento
          </label>
          <select
            name="payment_method_id"
            value={filters.payment_method_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todas</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Produto(s)
          </label>
          <ProductMultiSelectFilter
            products={products}
            selectedIds={filters.product_ids}
            onChange={handleProductSelect}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="include_cancelled"
              checked={filters.include_cancelled}
              onChange={handleChange}
            />
            Incluir canceladas
          </label>
          <Button type="submit" variant="primary" size="small">
            Filtrar
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500">Faturamento</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrencyInCents(report.summary.revenue_in_cents)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500">Vendas</p>
              <p className="text-xl font-bold text-gray-900">
                {report.summary.sales_count}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500">Ticket Médio</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrencyInCents(report.summary.ticket_avg_in_cents)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500">Total de Descontos</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrencyInCents(report.summary.total_discount_in_cents)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            <SalesBreakdownChart
              title="Faturamento por produto"
              items={report.by_product.map((row) => ({
                id: row.product_id,
                label: row.product_name,
                value: row.revenue_in_cents,
              }))}
              valueFormatter={formatCurrencyInCents}
            />
            <SalesBreakdownChart
              title="Faturamento por forma de pagamento"
              items={report.by_payment_method.map((row) => ({
                id: row.payment_method_id,
                label: row.payment_method_name,
                value: row.total_in_cents,
              }))}
              valueFormatter={formatCurrencyInCents}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2 pr-4">Nº</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Forma</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Status</th>
                  {canCancel && <th className="py-2 pr-4">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="py-2 pr-4">#{sale.sale_number}</td>
                    <td className="py-2 pr-4">
                      {new Date(sale.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 pr-4">
                      {sale.payments
                        .map(
                          (payment) =>
                            `${payment.payment_method_name_snapshot}` +
                            (payment.payment_method_variant_name_snapshot
                              ? ` (${payment.payment_method_variant_name_snapshot})`
                              : "") +
                            (sale.payments.length > 1
                              ? ` — ${formatCurrencyInCents(payment.amount_in_cents)}`
                              : ""),
                        )
                        .join(" + ")}
                    </td>
                    <td className="py-2 pr-4">
                      {formatCurrencyInCents(sale.total_in_cents)}
                    </td>
                    <td className="py-2 pr-4">
                      {sale.status === "completed" ? "Concluída" : "Cancelada"}
                    </td>
                    {canCancel && (
                      <td className="py-2 pr-4">
                        {sale.status === "completed" && (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Motivo"
                              value={cancelReasonBySale[sale.id] || ""}
                              onChange={(e) =>
                                setCancelReasonBySale((prev) => ({
                                  ...prev,
                                  [sale.id]: e.target.value,
                                }))
                              }
                              className="w-28 px-2 py-1 border border-gray-300 rounded-md text-xs"
                            />
                            <Button
                              variant="link"
                              size="small"
                              className="text-red-600"
                              onClick={() => handleCancel(sale.id)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {report.sales.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Nenhuma venda encontrada para os filtros selecionados.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="text-center text-gray-500 py-8">
          Use os filtros acima para gerar o relatório.
        </p>
      )}
    </div>
  );
}
