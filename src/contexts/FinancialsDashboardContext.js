import React, { createContext, useContext, useState, useMemo } from "react";

// 1. Criar o Contexto
const FinancialsDashboardContext = createContext(null);

// 2. Criar o Provedor (Provider)
export function FinancialsDashboardProvider({ children }) {
  // Este estado é o "gatilho".
  // Qualquer componente que o "ouvir", recarregará quando ele mudar.
  const [kpiTrigger, setKpiTrigger] = useState(0);

  // A função para "puxar" o gatilho
  const triggerKpiRefetch = () => {
    setKpiTrigger((c) => c + 1); // Simplesmente incrementa o contador
  };

  const value = useMemo(
    () => ({
      kpiTrigger,
      triggerKpiRefetch,
    }),
    [kpiTrigger],
  );

  return (
    <FinancialsDashboardContext.Provider value={value}>
      {children}
    </FinancialsDashboardContext.Provider>
  );
}

// 3. Criar o Hook customizado para usar o contexto
export const useFinancialsDashboard = () => {
  const context = useContext(FinancialsDashboardContext);
  if (!context) {
    throw new Error(
      "useFinancialsDashboard deve ser usado dentro de um FinancialsDashboardProvider",
    );
  }
  return context;
};
