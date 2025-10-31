import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext";

export function usePaymentManagement(user, canFetch) {
  const router = useRouter();
  const { triggerKpiRefetch, kpiTrigger } = useFinancialsDashboard();
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("awaiting_confirmation");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTaskRunning, setIsTaskRunning] = useState(false);

  const runManualTasks = useCallback(async () => {
    setIsTaskRunning(true);
    setError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.TASKS}/run`, // (Assumindo /api/v1/tasks)
        { method: "POST" },
      );

      return await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: () => {
          // Sucesso! Recarrega tudo.
          triggerKpiRefetch();
        },
      });
    } catch (e) {
      setError("Erro de conexão ao executar as tarefas.");
      setTimeout(() => {
        setError(null);
      }, 2000);
      console.error("Erro ao executar tarefas:", e);
    } finally {
      setIsTaskRunning(false);
    }
  }, [router, triggerKpiRefetch]);

  const fetchData = useCallback(async () => {
    if (!user || !canFetch) {
      setIsLoading(false);
      return;
    }
    // Não seta isLoading(true) aqui, para evitar piscar ao atualizar
    setError(null);

    try {
      const response = await fetch(settings.global.API.ENDPOINTS.PAYMENTS);
      const paymentsResult = await handleApiResponse({
        response,
        router,
        setError, // Usa o setError do hook
        onSuccess: (data) => data,
      });

      if (paymentsResult !== null) {
        setPayments(paymentsResult);
      }
    } catch (e) {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      setTimeout(() => {
        setError(null);
        setIsLoading(false);
      }, 2000);
      console.error("Erro ao buscar pagamentos do dashboard:", e);
    } finally {
      // Seta isLoading(false) apenas se ainda não foi feito
      if (isLoading) setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canFetch]); // Mantém as dependências originais

  // --- useEffect PRINCIPAL ATUALIZADO ---
  useEffect(() => {
    // Seta isLoading(true) apenas na primeira carga ou quando o trigger muda
    setIsLoading(true);
    fetchData();
  }, [fetchData, kpiTrigger]); // <-- 3. ADICIONAR kpiTrigger AQUI

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
        setTimeout(() => {
          setError(null);
          setIsLoading(false);
        }, 2000);
        console.error("Erro ao confirmar pagamento:", e);
      }
    },
    [router, triggerKpiRefetch],
  );

  /**
   * Deleta um pagamento e atualiza a lista.
   */
  const deletePayment = useCallback(
    async (paymentId) => {
      setError(null);
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PAYMENTS}/${paymentId}`,
          {
            method: "DELETE",
          },
        );

        return await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (deletedPayment) => {
            // Atualiza a lista localmente (melhor UX)
            setPayments((prevPayments) =>
              prevPayments.filter((p) => p.id !== deletedPayment.id),
            );
            // Dispara o trigger para atualizar os KPIs
            triggerKpiRefetch();
          },
          onError: () => {
            setTimeout(() => {
              setError(null);
              setIsLoading(false);
            }, 2000);
          },
        });
      } catch (e) {
        setError("Erro de conexão ao deletar o pagamento.");
        setTimeout(() => {
          setError(null);
          setIsLoading(false);
        }, 2000);
        console.error("Erro ao deletar pagamento:", e);
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
    confirmPayment,
    deletePayment,
    isTaskRunning,
    runManualTasks,
  };
}
