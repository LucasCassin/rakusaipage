// src/hooks/usePaymentManagement.js
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";

export function usePaymentManagement(user, canFetch) {
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("awaiting_confirmation");
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
      const response = await fetch(settings.global.API.ENDPOINTS.PAYMENTS);
      const paymentsResult = await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: (data) => data,
      });

      if (paymentsResult !== null) {
        setPayments(paymentsResult);
      }
    } catch (e) {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      console.error("Erro ao buscar pagamentos do dashboard:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user, canFetch]); // Removido 'router' da dependência

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    switch (activeTab) {
      case "awaiting_confirmation":
        return payments.filter(
          (p) => p.user_notified_payment && p.status === "PENDING",
        );
      case "pending_overdue":
        return payments.filter(
          (p) => p.status === "PENDING" || p.status === "OVERDUE",
        );
      case "history":
        return payments;
      default:
        return [];
    }
  }, [activeTab, payments]);

  return {
    payments: filteredPayments, // Retorna apenas os filtrados
    activeTab,
    setActiveTab,
    isLoading,
    error,
  };
}
