import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";

export function useFinancialDashboard(user, canFetch) {
  const router = useRouter();
  const [kpiData, setKpiData] = useState({
    activeStudents: "...",
    revenueThisMonth: "...",
    pendingThisMonth: "...",
    awaitingConfirmation: "...",
  });
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("awaiting_confirmation");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper interno para encapsular a lógica de fetch + handleApiResponse
  const fetchAndHandle = async (url) => {
    const response = await fetch(url);
    return handleApiResponse({
      response,
      router,
      setError,
      onSuccess: (data) => data,
    });
  };

  const fetchData = useCallback(async () => {
    if (!user || !canFetch) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Busca KPIs e Pagamentos em paralelo
      // NOTA: Assumindo o endpoint 'FINANCIALS_KPI' para os KPIs
      const [kpiResult, paymentsResult] = await Promise.all([
        fetchAndHandle(settings.global.API.ENDPOINTS.FINANCIALS_KPI),
        fetchAndHandle(settings.global.API.ENDPOINTS.PAYMENTS),
      ]);

      // handleApiResponse retorna null em caso de erro
      // Atualizamos os estados individualmente,
      // assim se um falhar, o outro ainda pode ser exibido.
      if (kpiResult !== null) {
        setKpiData(kpiResult);
      }

      if (paymentsResult !== null) {
        setPayments(paymentsResult);
      }
    } catch (e) {
      // Erro de conexão (ex: rede)
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      console.error("Erro ao buscar dados do dashboard:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user, canFetch, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    kpiData,
    payments,
    activeTab,
    setActiveTab,
    isLoading,
    error,
  };
}
