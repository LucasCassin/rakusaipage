import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrencyInCents } from "src/utils/formatCurrencyInCents";

/**
 * Gera o PDF do relatório de vendas do PDV desenhando texto e formas
 * vetoriais diretamente no jsPDF (sem tirar "print" da tela em HTML), para
 * que o texto continue nítido e selecionável em qualquer zoom/impressão.
 */

const PAGE_MARGIN = 14;
const PURPLE = [176, 0, 176];
const GRAY_25 = [249, 250, 251];
const GRAY_BAR_BG = [229, 231, 235];
const GRAY_LINE = [209, 213, 219];
const GRAY_LABEL = [107, 114, 128];
const TEXT_DARK = [17, 24, 39];
const WHITE = [255, 255, 255];

function truncateText(pdf, text, maxWidth) {
  if (!text) return "";
  if (pdf.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && pdf.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function formatDayFull(day) {
  const [year, month, dayOfMonth] = day.split("-");
  return `${dayOfMonth}/${month}/${year}`;
}

function formatDayLabel(day) {
  const [, month, dayOfMonth] = day.split("-");
  return `${dayOfMonth}/${month}`;
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

// As variantes já pertencem a uma única forma de pagamento, mas o mesmo nome
// de variante pode se repetir em formas diferentes — soma essas ocorrências.
function dedupeVariantsByName(byVariant) {
  const totals = {};
  (byVariant || []).forEach((row) => {
    const key = row.variant_name;
    if (!totals[key]) totals[key] = { id: key, label: key, value: 0 };
    totals[key].value += row.total_in_cents;
  });
  return Object.values(totals);
}

function computeInsights(report) {
  const totalRevenue = report.summary.revenue_in_cents;
  const topProductByRevenue = report.by_product[0] || null;
  const topProductByQty =
    [...report.by_product].sort(
      (a, b) => b.quantity_sold - a.quantity_sold,
    )[0] || null;
  const topPaymentMethod = report.by_payment_method[0] || null;
  const days = report.by_day || [];
  const bestDay =
    days.length > 1
      ? [...days].sort((a, b) => b.revenue_in_cents - a.revenue_in_cents)[0]
      : null;
  const worstDay =
    days.length > 1
      ? [...days].sort((a, b) => a.revenue_in_cents - b.revenue_in_cents)[0]
      : null;

  return {
    totalRevenue,
    topProductByRevenue,
    topProductByQty,
    topPaymentMethod,
    bestDay,
    worstDay,
  };
}

function pctOf(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function addSectionTitle(pdf, { x, y, text }) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(...TEXT_DARK);
  pdf.text(text, x, y);
  pdf.setDrawColor(...PURPLE);
  pdf.setLineWidth(0.6);
  pdf.line(x, y + 2.5, x + pdf.getTextWidth(text), y + 2.5);
}

function drawKpiRow(pdf, { x, y, width, kpis }) {
  const gap = 5;
  const tileWidth = (width - gap * (kpis.length - 1)) / kpis.length;
  const tileHeight = 22;

  kpis.forEach((kpi, i) => {
    const tileX = x + i * (tileWidth + gap);
    pdf.setFillColor(...GRAY_25);
    pdf.setDrawColor(...GRAY_LINE);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(tileX, y, tileWidth, tileHeight, 1.5, 1.5, "FD");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text(kpi.label, tileX + 4, y + 7);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(String(kpi.value), tileX + 4, y + 17);
  });

  return y + tileHeight;
}

/**
 * Barra horizontal simples (um único hue, magnitude relativa ao total do
 * grupo) — mesma lógica visual do componente SalesBreakdownChart usado na
 * tela, só que desenhada como vetor real em vez de capturada como imagem.
 */
function drawBarChart(
  pdf,
  { x, y, width, height, title, items, valueFormatter, maxItems = 22 },
) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...TEXT_DARK);
  pdf.text(title, x, y);

  const top = items.slice(0, maxItems);
  const chartTop = y + 6;

  if (top.length === 0) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text("Nenhum dado para o período.", x, chartTop + 6);
    return;
  }

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const footerSpace = items.length > maxItems ? 5 : 0;
  const availableHeight = height - 6 - footerSpace;
  const rowH = Math.min(7.5, availableHeight / top.length);
  const labelWidth = width * 0.32;
  const valueWidth = 24;
  const barAreaX = x + labelWidth;
  const barAreaWidth = width - labelWidth - valueWidth;

  top.forEach((item, i) => {
    const rowY = chartTop + i * rowH;
    const barH = rowH * 0.55;
    const barY = rowY + (rowH - barH) / 2;
    const pct = total > 0 ? item.value / total : 0;
    const barW = Math.max(barAreaWidth * pct, 0.8);
    const textY = rowY + rowH / 2 + 1;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(truncateText(pdf, item.label, labelWidth - 2), x, textY);

    pdf.setFillColor(...GRAY_BAR_BG);
    pdf.rect(barAreaX, barY, barAreaWidth, barH, "F");
    pdf.setFillColor(...PURPLE);
    pdf.rect(barAreaX, barY, barW, barH, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(valueFormatter(item.value), x + width - 1, textY, {
      align: "right",
    });
  });

  if (items.length > maxItems) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(7);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text(
      `Mostrando os ${maxItems} maiores de ${items.length}.`,
      x,
      chartTop + top.length * rowH + 4,
    );
  }
}

function addFooters(pdf, title) {
  const totalPages = pdf.internal.getNumberOfPages();
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...GRAY_LINE);
    pdf.setLineWidth(0.2);
    pdf.line(PAGE_MARGIN, pageH - 9, pageW - PAGE_MARGIN, pageH - 9);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...GRAY_LABEL);
    pdf.text(title, PAGE_MARGIN, pageH - 5);
    pdf.text(`Página ${i} de ${totalPages}`, pageW - PAGE_MARGIN, pageH - 5, {
      align: "right",
    });
  }
}

const AUTOTABLE_THEME = {
  headStyles: {
    fillColor: PURPLE,
    textColor: WHITE,
    fontStyle: "bold",
    fontSize: 9,
  },
  alternateRowStyles: { fillColor: GRAY_25 },
  bodyStyles: { fontSize: 8.5, textColor: TEXT_DARK },
  styles: { cellPadding: 2.2, lineColor: GRAY_LINE, lineWidth: 0.1 },
  margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
};

export function generateSalesReportPdf({
  report,
  title,
  includeAnalytic,
  fileName,
}) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - PAGE_MARGIN * 2;
  const insights = computeInsights(report);
  const hasMultipleDays = (report.by_day || []).length > 1;

  // ---------------------------------------------------------------------
  // PÁGINA 1 — Capa, KPIs e resumo executivo
  // ---------------------------------------------------------------------
  pdf.setFillColor(...PURPLE);
  pdf.rect(0, 0, pageW, 30, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(20);
  pdf.setTextColor(...WHITE);
  pdf.text(title.toUpperCase(), PAGE_MARGIN, 14);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Relatório de Vendas — PDV Rakusai Taiko", PAGE_MARGIN, 22);
  pdf.setFontSize(9);
  pdf.text(
    `Período: ${formatPeriodDate(report.period.start)} até ${formatPeriodDate(report.period.end)}`,
    pageW - PAGE_MARGIN,
    22,
    { align: "right" },
  );

  let cursorY = drawKpiRow(pdf, {
    x: PAGE_MARGIN,
    y: 40,
    width: contentW,
    kpis: [
      {
        label: "FATURAMENTO",
        value: formatCurrencyInCents(report.summary.revenue_in_cents),
      },
      { label: "VENDAS", value: report.summary.sales_count },
      {
        label: "TICKET MÉDIO",
        value: formatCurrencyInCents(report.summary.ticket_avg_in_cents),
      },
      {
        label: "TOTAL DE DESCONTOS",
        value: formatCurrencyInCents(report.summary.total_discount_in_cents),
      },
    ],
  });

  cursorY += 14;
  addSectionTitle(pdf, {
    x: PAGE_MARGIN,
    y: cursorY,
    text: "Resumo executivo",
  });
  cursorY += 10;

  const insightRows = [];
  if (insights.topProductByRevenue) {
    const p = insights.topProductByRevenue;
    insightRows.push({
      label: "Produto que mais faturou",
      value: `${p.product_name} — ${formatCurrencyInCents(p.revenue_in_cents)} (${pctOf(p.revenue_in_cents, insights.totalRevenue)}% do faturamento)`,
    });
  }
  if (insights.topProductByQty) {
    const p = insights.topProductByQty;
    insightRows.push({
      label: "Produto mais vendido em quantidade",
      value: `${p.product_name} — ${p.quantity_sold} unidade${p.quantity_sold === 1 ? "" : "s"}`,
    });
  }
  if (insights.topPaymentMethod) {
    const pm = insights.topPaymentMethod;
    insightRows.push({
      label: "Forma de pagamento preferida",
      value: `${pm.payment_method_name} — ${formatCurrencyInCents(pm.total_in_cents)} (${pctOf(pm.total_in_cents, insights.totalRevenue)}% do faturamento)`,
    });
  }
  insightRows.push({
    label: "Ticket médio geral",
    value: formatCurrencyInCents(report.summary.ticket_avg_in_cents),
  });
  if (insights.bestDay) {
    insightRows.push({
      label: "Melhor dia de vendas",
      value: `${formatDayFull(insights.bestDay.day)} — ${formatCurrencyInCents(insights.bestDay.revenue_in_cents)}${insights.bestDay.top_product_name ? `, puxado por ${insights.bestDay.top_product_name}` : ""}`,
    });
  }
  if (insights.worstDay && insights.worstDay.day !== insights.bestDay?.day) {
    insightRows.push({
      label: "Dia mais fraco",
      value: `${formatDayFull(insights.worstDay.day)} — ${formatCurrencyInCents(insights.worstDay.revenue_in_cents)}`,
    });
  }

  const insightColWidth = (contentW - 10) / 2;
  insightRows.forEach((row, i) => {
    const col = i % 2;
    const rowIndex = Math.floor(i / 2);
    const rowX = PAGE_MARGIN + col * (insightColWidth + 10);
    const rowY = cursorY + rowIndex * 20;

    pdf.setFillColor(...PURPLE);
    pdf.circle(rowX + 1, rowY - 1.3, 1, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...TEXT_DARK);
    pdf.text(row.label, rowX + 5, rowY);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...GRAY_LABEL);
    const lines = pdf.splitTextToSize(row.value, insightColWidth - 5);
    pdf.text(lines, rowX + 5, rowY + 5);
  });

  // ---------------------------------------------------------------------
  // PÁGINA 2 — Gráficos (uma página inteira, mais itens por gráfico)
  // ---------------------------------------------------------------------
  pdf.addPage();
  addSectionTitle(pdf, {
    x: PAGE_MARGIN,
    y: 18,
    text: "Faturamento por quebra",
  });

  const chartTop = 26;
  const chartGap = 8;
  const chartWidth = (contentW - chartGap) / 2;
  const chartHeight = (pageH - chartTop - PAGE_MARGIN - 12 - chartGap) / 2;

  drawBarChart(pdf, {
    x: PAGE_MARGIN,
    y: chartTop,
    width: chartWidth,
    height: chartHeight,
    title: "Por produto",
    items: report.by_product.map((row) => ({
      id: row.product_id,
      label: row.product_name,
      value: row.revenue_in_cents,
    })),
    valueFormatter: formatCurrencyInCents,
  });
  drawBarChart(pdf, {
    x: PAGE_MARGIN + chartWidth + chartGap,
    y: chartTop,
    width: chartWidth,
    height: chartHeight,
    title: "Por forma de pagamento",
    items: report.by_payment_method.map((row) => ({
      id: row.payment_method_id,
      label: row.payment_method_name,
      value: row.total_in_cents,
    })),
    valueFormatter: formatCurrencyInCents,
  });
  drawBarChart(pdf, {
    x: PAGE_MARGIN,
    y: chartTop + chartHeight + chartGap,
    width: chartWidth,
    height: chartHeight,
    title: "Por variante",
    items: dedupeVariantsByName(report.by_variant),
    valueFormatter: formatCurrencyInCents,
  });
  drawBarChart(pdf, {
    x: PAGE_MARGIN + chartWidth + chartGap,
    y: chartTop + chartHeight + chartGap,
    width: chartWidth,
    height: chartHeight,
    title: "Por vendedor",
    items: (report.by_seller || []).map((row) => ({
      id: row.seller_id,
      label: row.seller_username,
      value: row.total_in_cents,
    })),
    valueFormatter: formatCurrencyInCents,
  });

  // ---------------------------------------------------------------------
  // PÁGINA 3 — KPIs por dia (só quando o período cobre mais de um dia)
  // ---------------------------------------------------------------------
  if (hasMultipleDays) {
    pdf.addPage();
    addSectionTitle(pdf, { x: PAGE_MARGIN, y: 18, text: "KPIs por dia" });

    drawBarChart(pdf, {
      x: PAGE_MARGIN,
      y: 26,
      width: contentW,
      height: 46,
      title: "Faturamento por dia",
      items: report.by_day.map((row) => ({
        id: row.day,
        label: formatDayLabel(row.day),
        value: row.revenue_in_cents,
      })),
      valueFormatter: formatCurrencyInCents,
      maxItems: 31,
    });

    autoTable(pdf, {
      ...AUTOTABLE_THEME,
      startY: 80,
      head: [
        [
          "Dia",
          "Vendas",
          "Faturamento",
          "Ticket Médio",
          "Desconto",
          "Produto mais vendido",
          "Forma mais usada",
          "Variante mais usada",
        ],
      ],
      body: report.by_day.map((row) => [
        formatDayFull(row.day),
        String(row.sales_count),
        formatCurrencyInCents(row.revenue_in_cents),
        formatCurrencyInCents(row.ticket_avg_in_cents),
        formatCurrencyInCents(row.total_discount_in_cents),
        row.top_product_name || "—",
        row.top_payment_method_name || "—",
        row.top_variant_name || "—",
      ]),
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });
  }

  // ---------------------------------------------------------------------
  // PÁGINA — Produtos vendidos
  // ---------------------------------------------------------------------
  pdf.addPage();
  addSectionTitle(pdf, { x: PAGE_MARGIN, y: 18, text: "Produtos vendidos" });

  autoTable(pdf, {
    ...AUTOTABLE_THEME,
    startY: 26,
    head: [["Produto", "Quantidade", "Faturamento", "% do total"]],
    body: report.by_product.map((row) => [
      row.product_name,
      String(row.quantity_sold),
      formatCurrencyInCents(row.revenue_in_cents),
      `${pctOf(row.revenue_in_cents, insights.totalRevenue)}%`,
    ]),
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  // ---------------------------------------------------------------------
  // PÁGINA(S) — Analítico de vendas (opcional)
  // ---------------------------------------------------------------------
  if (includeAnalytic) {
    pdf.addPage();
    addSectionTitle(pdf, {
      x: PAGE_MARGIN,
      y: 18,
      text: "Analítico de vendas",
    });

    autoTable(pdf, {
      ...AUTOTABLE_THEME,
      startY: 26,
      head: [
        ["Nº", "Data", "Forma de pagamento", "Produtos", "Total", "Status"],
      ],
      body: report.sales.map((sale) => [
        `#${sale.sale_number}`,
        new Date(sale.created_at).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        }),
        sale.payments
          .map(
            (payment) =>
              `${payment.payment_method_name_snapshot}${payment.payment_method_variant_name_snapshot ? ` (${payment.payment_method_variant_name_snapshot})` : ""}${sale.payments.length > 1 ? ` — ${formatCurrencyInCents(payment.amount_in_cents)}` : ""}`,
          )
          .join(" + "),
        (sale.items || [])
          .map((item) => `${item.quantity}x ${item.product_name_snapshot}`)
          .join(", "),
        formatCurrencyInCents(sale.total_in_cents),
        sale.status === "completed" ? "Concluída" : "Cancelada",
      ]),
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "center" },
      },
    });
  }

  addFooters(pdf, title);
  pdf.save(fileName);
}
