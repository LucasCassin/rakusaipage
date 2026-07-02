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
  // O denominador é a soma de TODOS os itens (não só os exibidos), para que
  // o tamanho da barra reflita a fatia real do total — uma barra só fica
  // cheia se aquele item responder por 100% das vendas daquela quebra.
  const totalValue = items.reduce((sum, item) => sum + item.value, 0);

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
            const percentOfTotal =
              totalValue > 0 ? (item.value / totalValue) * 100 : 0;
            const widthPercent =
              totalValue > 0 ? Math.max(2, percentOfTotal) : 0;
            return (
              <div key={item.id} className="flex items-center gap-3">
                <span
                  className="w-24 sm:w-32 flex-shrink-0 text-xs text-gray-700 truncate"
                  title={item.label}
                >
                  {item.label}
                </span>
                <div className="group relative flex-1 min-w-0 h-5 bg-gray-100 rounded-r-sm">
                  <div
                    className="h-5 origin-left scale-100 rounded-r-sm bg-rakusai-purple transition-transform duration-150 group-hover:scale-105"
                    style={{ width: `${widthPercent}%` }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 invisible whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                    <p className="font-semibold">{item.label}</p>
                    <p>
                      {valueFormatter(item.value)} · {percentOfTotal.toFixed(1)}
                      % do total
                    </p>
                    <div className="absolute top-full left-3 -mt-1 h-2 w-2 rotate-45 bg-gray-800" />
                  </div>
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
