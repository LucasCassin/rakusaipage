// src/hooks/useFinancialKPIs.js
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext";

export function useFinancialKPIs(user, canFetch) {
  const router = useRouter();
  const { kpiTrigger } = useFinancialsDashboard();
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
      const response = await fetch(
        settings.global.API.ENDPOINTS.FINANCIALS_KPI,
      );
      const kpiResult = await handleApiResponse({
        response,
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
  }, [user, canFetch, kpiTrigger]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { kpiData, isLoading, error };
}
