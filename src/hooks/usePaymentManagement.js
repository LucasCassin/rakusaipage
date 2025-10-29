import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext";

export function usePaymentManagement(user, canFetch) {
  const router = useRouter();
  const { triggerKpiRefetch } = useFinancialsDashboard();
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

  // --- NOVA FUNÇÃO ---
  /**
   * Confirma um pagamento e atualiza a lista.
   */
  const confirmPayment = useCallback(
    async (paymentId) => {
      setError(null);

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PAYMENTS}/${paymentId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            // ADICIONADO: O corpo (body) que o novo patchHandler espera
            body: JSON.stringify({ action: "confirm_paid" }),
          },
        );

        await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (confirmedPayment) => {
            setPayments((prevPayments) =>
              prevPayments.map((p) =>
                p.id === paymentId ? { ...p, ...confirmedPayment } : p,
              ),
            );
            triggerKpiRefetch();
          },
        });
      } catch (e) {
        setError("Erro de conexão ao confirmar o pagamento.");
        console.error("Erro ao confirmar pagamento:", e);
      }
    },
    [router, triggerKpiRefetch],
  );
  // --- FIM DA NOVA FUNÇÃO ---

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
    payments: filteredPayments,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    confirmPayment, // <-- Expondo a nova função
  };
}
