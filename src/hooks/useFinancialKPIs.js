import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext";

// (Helpers de data permanecem os mesmos)
const getISODate = (d) => d.toISOString().split("T")[0];

const getDefaultMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: getISODate(firstDay),
    endDate: getISODate(lastDay),
  };
};

export function useFinancialKPIs(user, canFetch) {
  const router = useRouter();
  const { kpiTrigger } = useFinancialsDashboard();
  const [selectedRange, setSelectedRange] = useState(getDefaultMonthRange());

  const [kpiData, setKpiData] = useState({
    activeStudents: "...",
    revenueThisMonth: "...",
    pendingThisMonth: "...",
    awaitingConfirmation: "...",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user || !canFetch) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = selectedRange;
      const url = `${settings.global.API.ENDPOINTS.FINANCIALS_KPI}?startDate=${startDate}&endDate=${endDate}`;

      // --- GARANTA QUE O 'await' ESTÁ AQUI ---
      const response = await fetch(url);

      // Esta é a linha 55 (aprox.) que chama handleApiResponse
      const kpiResult = await handleApiResponse({
        response, // Passa o objeto de Resposta, não a Promessa
        router,
        setError,
        onSuccess: (data) => data,
      });

      if (kpiResult !== null) {
        setKpiData(kpiResult);
      }
    } catch (e) {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      console.error("Erro ao buscar KPIs do dashboard:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user, canFetch, selectedRange, router]);

  useEffect(() => {
    if (canFetch) {
      fetchData();
    }
  }, [fetchData, canFetch, kpiTrigger]);

  return {
    kpiData,
    isLoading,
    error,
    selectedRange,
    setSelectedRange,
  };
}
