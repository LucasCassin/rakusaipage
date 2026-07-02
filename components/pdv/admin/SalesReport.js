import React, { useEffect, useState } from "react";
import Button from "components/ui/Button";
import MultiSelectFilter from "components/pdv/admin/MultiSelectFilter";
import SalesBreakdownChart from "components/pdv/admin/SalesBreakdownChart";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

const emptyFilters = {
  start_date: "",
  end_date: "",
  payment_method_ids: [],
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
  const [pendingCancelSaleId, setPendingCancelSaleId] = useState(null);
  const [cancellingSaleId, setCancellingSaleId] = useState(null);

  // Reseta o botão "Certeza?" após 3 segundos, como em
  // `components/ui/PaymentListItem.js`.
  useEffect(() => {
    if (!pendingCancelSaleId) return;
    const timer = setTimeout(() => setPendingCancelSaleId(null), 3000);
    return () => clearTimeout(timer);
  }, [pendingCancelSaleId]);

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

  const handlePaymentMethodSelect = (selected) => {
    setFilters((prev) => ({ ...prev, payment_method_ids: selected }));
  };

  const buildReportQuery = () => ({
    ...filters,
    product_ids: filters.product_ids.join(","),
    payment_method_ids: filters.payment_method_ids.join(","),
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
    if (pendingCancelSaleId !== saleId) {
      setPendingCancelSaleId(saleId);
      return;
    }
    setPendingCancelSaleId(null);
    setCancellingSaleId(saleId);
    const result = await onCancelSale(saleId, cancelReasonBySale[saleId] || "");
    setCancelReasonBySale((prev) => ({ ...prev, [saleId]: "" }));
    setCancellingSaleId(null);
    // Atualiza a tabela com os mesmos filtros para refletir o cancelamento.
    if (result) onFetch(buildReportQuery());
  };

  // As variantes já pertencem a uma única forma de pagamento, mas o mesmo
  // nome de variante pode se repetir em formas diferentes (ex: duas formas
  // com uma variante "Balcão") — este gráfico soma essas ocorrências.
  const variantTotalsByName = {};
  (report?.by_variant || []).forEach((row) => {
    const key = row.variant_name;
    if (!variantTotalsByName[key]) {
      variantTotalsByName[key] = { id: key, label: key, value: 0 };
    }
    variantTotalsByName[key].value += row.total_in_cents;
  });

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
            Forma(s) de pagamento
          </label>
          <MultiSelectFilter
            items={paymentMethods}
            selectedIds={filters.payment_method_ids}
            onChange={handlePaymentMethodSelect}
            allLabel="Todas as formas de pagamento"
            selectedLabel={(count) =>
              `${count} forma${count > 1 ? "s" : ""} de pagamento selecionada${count > 1 ? "s" : ""}`
            }
            emptyLabel="Nenhuma forma de pagamento cadastrada."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Produto(s)
          </label>
          <MultiSelectFilter
            items={products}
            selectedIds={filters.product_ids}
            onChange={handleProductSelect}
            allLabel="Todos os produtos"
            selectedLabel={(count) =>
              `${count} produto${count > 1 ? "s" : ""} selecionado${count > 1 ? "s" : ""}`
            }
            emptyLabel="Nenhum produto cadastrado."
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
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6">
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              Visão Geral
            </h4>

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
                  {formatCurrencyInCents(
                    report.summary.total_discount_in_cents,
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <SalesBreakdownChart
                title="Faturamento por variante"
                items={Object.values(variantTotalsByName)}
                valueFormatter={formatCurrencyInCents}
              />
              <SalesBreakdownChart
                title="Faturamento por variante e forma de pagamento"
                items={report.by_variant.map((row) => ({
                  id: row.payment_method_variant_id,
                  label: `${row.payment_method_name} - ${row.variant_name}`,
                  value: row.total_in_cents,
                }))}
                valueFormatter={formatCurrencyInCents}
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <h4 className="text-base font-semibold text-gray-900 mb-4">
              Analítico
            </h4>

            <div className="overflow-x-auto mb-8">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">
                Produtos vendidos
              </h5>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Produto</th>
                    <th className="py-2 pr-4 text-center">Quantidade</th>
                    <th className="py-2 pr-4 text-right">Faturamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.by_product.map((row) => (
                    <tr key={row.product_id}>
                      <td className="py-2 pr-4">{row.product_name}</td>
                      <td className="py-2 pr-4 text-center">
                        {row.quantity_sold}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrencyInCents(row.revenue_in_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.by_product.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Nenhum produto vendido para os filtros selecionados.
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">
                Vendas
              </h5>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4">Nº</th>
                    <th className="py-2 pr-4">Data</th>
                    <th className="py-2 pr-4">Forma</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2 pr-4">Status</th>
                    {canCancel && (
                      <th className="py-2 pr-4 text-center">Ações</th>
                    )}
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
                        {sale.status === "completed"
                          ? "Concluída"
                          : "Cancelada"}
                      </td>
                      {canCancel && (
                        <td className="py-2 pr-4">
                          {sale.status === "completed" && (
                            <div className="flex items-center justify-center gap-2">
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
                                variant={
                                  pendingCancelSaleId === sale.id
                                    ? "warning"
                                    : "danger"
                                }
                                size="small"
                                onClick={() => handleCancel(sale.id)}
                                disabled={
                                  cancellingSaleId === sale.id ||
                                  (pendingCancelSaleId &&
                                    pendingCancelSaleId !== sale.id)
                                }
                              >
                                {cancellingSaleId === sale.id
                                  ? "Cancelando..."
                                  : pendingCancelSaleId === sale.id
                                    ? "Certeza?"
                                    : "Cancelar"}
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
