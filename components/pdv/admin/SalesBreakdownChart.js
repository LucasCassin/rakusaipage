import React from "react";

/**
 * Barra horizontal simples (magnitude, um único hue) para comparar vendas
 * por produto / forma de pagamento sem precisar filtrar um de cada vez.
 * `items` já deve vir ordenado (maior valor primeiro).
 */
export default function SalesBreakdownChart({
  title,
  items,
  valueFormatter,
  maxBars = 8,
}) {
  const topItems = items.slice(0, maxBars);
  const maxValue = topItems.reduce((max, item) => Math.max(max, item.value), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>

      {topItems.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          Nenhum dado para o período.
        </p>
      ) : (
        <div className="space-y-2">
          {topItems.map((item) => {
            const widthPercent =
              maxValue > 0 ? Math.max(2, (item.value / maxValue) * 100) : 0;
            return (
              <div key={item.id} className="flex items-center gap-3">
                <span
                  className="w-24 sm:w-32 flex-shrink-0 text-xs text-gray-700 truncate"
                  title={item.label}
                >
                  {item.label}
                </span>
                <div className="flex-1 min-w-0 h-5 bg-gray-100 rounded-r-sm">
                  <div
                    className="h-5 bg-rakusai-purple rounded-r-sm"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="w-24 flex-shrink-0 text-xs font-semibold text-gray-900 text-right tabular-nums">
                  {valueFormatter(item.value)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {items.length > maxBars && (
        <p className="mt-2 text-xs text-gray-400">
          Mostrando os {maxBars} maiores de {items.length}. Veja a tabela
          completa abaixo do gráfico.
        </p>
      )}
    </div>
  );
}
