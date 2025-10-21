import { useState, useEffect } from "react";

// No futuro, este hook fará chamadas de API reais.
export function useFinancialDashboard(user, canFetch) {
  const [kpiData, setKpiData] = useState({
    activeStudents: "...",
    revenueThisMonth: "...",
    pendingThisMonth: "...",
    awaitingConfirmation: "...",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Só busca se o usuário puder ver esta seção
      if (!user || !canFetch) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      // Simulação de uma chamada à API
      setTimeout(() => {
        setKpiData({
          activeStudents: 20,
          revenueThisMonth: "R$ 2.150,00",
          pendingThisMonth: "R$ 250,00",
          awaitingConfirmation: 3,
        });
        setIsLoading(false);
      }, 1500);
    };

    fetchData();
  }, [user, canFetch]);

  return { kpiData, isLoading, error };
}
