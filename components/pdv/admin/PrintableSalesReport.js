import React, { useMemo } from "react";
import SalesBreakdownChart from "components/pdv/admin/SalesBreakdownChart";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

const PRODUCTS_PER_PAGE = 28;
const SALES_PER_PAGE = 10;

function chunk(items, size) {
  if (items.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function formatPeriodDate(value) {
  if (value === "all") return "Início";
  if (value === "now" || !value) return "Agora";
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(day) {
  const [, month, dayOfMonth] = day.split("-");
  return `${dayOfMonth}/${month}`;
}

function formatDayFull(day) {
  const [year, month, dayOfMonth] = day.split("-");
  return `${dayOfMonth}/${month}/${year}`;
}

function formatSalePayments(sale) {
  return sale.payments
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
    .join(" + ");
}

function formatSaleItems(sale) {
  return (sale.items || [])
    .map((item) => `${item.quantity}x ${item.product_name_snapshot}`)
    .join(", ");
}

const KpiTile = ({ label, value }) => (
  <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-100">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const PrintableSalesReport = React.forwardRef(
  ({ report, title, includeAnalytic }, ref) => {
    // As variantes já pertencem a uma única forma de pagamento, mas o mesmo
    // nome de variante pode se repetir em formas diferentes — este gráfico
    // soma essas ocorrências (mesma lógica de components/pdv/admin/SalesReport.js).
    const variantTotalsByName = useMemo(() => {
      const totals = {};
      (report?.by_variant || []).forEach((row) => {
        const key = row.variant_name;
        if (!totals[key]) {
          totals[key] = { id: key, label: key, value: 0 };
        }
        totals[key].value += row.total_in_cents;
      });
      return Object.values(totals);
    }, [report]);

    const productPages = useMemo(
      () => chunk(report?.by_product || [], PRODUCTS_PER_PAGE),
      [report],
    );

    const salesPages = useMemo(
      () => chunk(report?.sales || [], SALES_PER_PAGE),
      [report],
    );

    if (!report) return null;

    const hasMultipleDays = (report.by_day || []).length > 1;

    return (
      <div
        ref={ref}
        className="fixed left-[-9999px] top-[-9999px] font-sans bg-white text-black [print-color-adjust:exact] [-webkit-print-color-adjust:exact] w-[297mm]"
        style={{
          fontFamily:
            "'Poppins', var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <style type="text/css" media="print">
          {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; font-family: 'Poppins', sans-serif !important; -webkit-print-color-adjust: exact; width: 100%; }
        `}
        </style>

        {/* PÁGINA 1: CAPA */}
        <div className="w-[297mm] h-[210mm] flex flex-col p-[15mm] box-border pdf-page-container">
          <div className="mb-8 pb-4 border-b-2 border-gray-800">
            <h1 className="text-3xl font-bold text-gray-900 uppercase">
              {title}
            </h1>
            <p className="text-gray-500 mt-1">
              Relatório de Vendas — PDV Rakusai Taiko
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Período: {formatPeriodDate(report.period.start)} até{" "}
              {formatPeriodDate(report.period.end)}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-6 mb-10">
            <KpiTile
              label="Faturamento"
              value={formatCurrencyInCents(report.summary.revenue_in_cents)}
            />
            <KpiTile label="Vendas" value={report.summary.sales_count} />
            <KpiTile
              label="Ticket Médio"
              value={formatCurrencyInCents(report.summary.ticket_avg_in_cents)}
            />
            <KpiTile
              label="Total de Descontos"
              value={formatCurrencyInCents(
                report.summary.total_discount_in_cents,
              )}
            />
          </div>

          <div className="flex-1 flex items-center justify-center">
            <img
              src="/images/logoColoridoV2.svg"
              alt="Rakusai Logo"
              className="h-40 w-auto object-contain opacity-90"
            />
          </div>
        </div>

        {/* PÁGINA 2: GRÁFICOS */}
        <div className="w-[297mm] h-[210mm] p-[12mm] box-border pdf-page-container">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Faturamento por quebra
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <SalesBreakdownChart
              title="Por produto"
              items={report.by_product.map((row) => ({
                id: row.product_id,
                label: row.product_name,
                value: row.revenue_in_cents,
              }))}
              valueFormatter={formatCurrencyInCents}
            />
            <SalesBreakdownChart
              title="Por forma de pagamento"
              items={report.by_payment_method.map((row) => ({
                id: row.payment_method_id,
                label: row.payment_method_name,
                value: row.total_in_cents,
              }))}
              valueFormatter={formatCurrencyInCents}
            />
            <SalesBreakdownChart
              title="Por variante"
              items={variantTotalsByName}
              valueFormatter={formatCurrencyInCents}
            />
            <SalesBreakdownChart
              title="Por vendedor"
              items={(report.by_seller || []).map((row) => ({
                id: row.seller_id,
                label: row.seller_username,
                value: row.total_in_cents,
              }))}
              valueFormatter={formatCurrencyInCents}
            />
          </div>
        </div>

        {/* PÁGINA 3 (SÓ SE HOUVER MAIS DE 1 DIA): KPIS POR DIA */}
        {hasMultipleDays && (
          <div className="w-[297mm] h-[210mm] p-[12mm] box-border pdf-page-container">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              KPIs por dia
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <SalesBreakdownChart
                title="Faturamento por dia"
                items={report.by_day.map((row) => ({
                  id: row.day,
                  label: formatDayLabel(row.day),
                  value: row.revenue_in_cents,
                }))}
                valueFormatter={formatCurrencyInCents}
                maxBars={31}
              />
              <div className="bg-white border border-gray-200 rounded-lg p-4 overflow-hidden">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Detalhe por dia
                </h4>
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 text-left border-b border-gray-200">
                      <th className="py-1 pr-2">Dia</th>
                      <th className="py-1 pr-2 text-center">Vendas</th>
                      <th className="py-1 pr-2 text-right">Faturamento</th>
                      <th className="py-1 pr-2 text-right">Ticket Médio</th>
                      <th className="py-1 pr-2 text-right">Desconto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_day.map((row) => (
                      <tr key={row.day} className="border-b border-gray-100">
                        <td className="py-1 pr-2">{formatDayFull(row.day)}</td>
                        <td className="py-1 pr-2 text-center">
                          {row.sales_count}
                        </td>
                        <td className="py-1 pr-2 text-right">
                          {formatCurrencyInCents(row.revenue_in_cents)}
                        </td>
                        <td className="py-1 pr-2 text-right">
                          {formatCurrencyInCents(row.ticket_avg_in_cents)}
                        </td>
                        <td className="py-1 pr-2 text-right">
                          {formatCurrencyInCents(row.total_discount_in_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PRODUTOS VENDIDOS (paginado) */}
        {productPages.map((page, pageIndex) => (
          <div
            key={`products-${pageIndex}`}
            className="w-[297mm] h-[210mm] p-[12mm] box-border pdf-page-container"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Produtos vendidos
            </h2>
            {productPages.length > 1 && (
              <p className="text-xs text-gray-400 mb-3">
                Página {pageIndex + 1} de {productPages.length}
              </p>
            )}
            <table className="min-w-full text-sm mt-3">
              <thead>
                <tr className="text-gray-500 text-left border-b-2 border-gray-200">
                  <th className="py-2 pr-4">Produto</th>
                  <th className="py-2 pr-4 text-center">Quantidade</th>
                  <th className="py-2 pr-4 text-right">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {page.map((row) => (
                  <tr key={row.product_id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-4">{row.product_name}</td>
                    <td className="py-1.5 pr-4 text-center">
                      {row.quantity_sold}
                    </td>
                    <td className="py-1.5 pr-4 text-right">
                      {formatCurrencyInCents(row.revenue_in_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {/* ANALÍTICO DE VENDAS (opcional, paginado) */}
        {includeAnalytic &&
          salesPages.map((page, pageIndex) => (
            <div
              key={`sales-${pageIndex}`}
              className="w-[297mm] h-[210mm] p-[12mm] box-border pdf-page-container"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Analítico de vendas
              </h2>
              {salesPages.length > 1 && (
                <p className="text-xs text-gray-400 mb-3">
                  Página {pageIndex + 1} de {salesPages.length}
                </p>
              )}
              <table className="min-w-full text-xs mt-3">
                <thead>
                  <tr className="text-gray-500 text-left border-b-2 border-gray-200">
                    <th className="py-2 pr-3">Nº</th>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Forma de pagamento</th>
                    <th className="py-2 pr-3">Produtos</th>
                    <th className="py-2 pr-3 text-right">Total</th>
                    <th className="py-2 pr-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {page.map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100">
                      <td className="py-1.5 pr-3">#{sale.sale_number}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {new Date(sale.created_at).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                      </td>
                      <td className="py-1.5 pr-3">
                        {formatSalePayments(sale)}
                      </td>
                      <td className="py-1.5 pr-3">{formatSaleItems(sale)}</td>
                      <td className="py-1.5 pr-3 text-right whitespace-nowrap">
                        {formatCurrencyInCents(sale.total_in_cents)}
                      </td>
                      <td className="py-1.5 pr-3 text-center">
                        {sale.status === "completed"
                          ? "Concluída"
                          : "Cancelada"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    );
  },
);

PrintableSalesReport.displayName = "PrintableSalesReport";
export default PrintableSalesReport;
