import { useState, useCallback } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";
// --- NOVOS IMPORTS ---
import { usePaymentPlans } from "src/hooks/usePaymentPlans"; // Para buscar a lista de planos
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext"; // Para o trigger de atualização

export function useUserFinancials(user) {
  const router = useRouter();
  const [financialData, setFinancialData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userFound, setUserFound] = useState(false);
  const [foundUserId, setFoundUserId] = useState(null);

  // --- NOVOS ESTADOS PARA O MODAL ---
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subModalMode, setSubModalMode] = useState("create"); // 'create' ou 'edit'
  const [currentSubscription, setCurrentSubscription] = useState(null); // Para 'edit'
  const [modalError, setModalError] = useState(null);

  // --- HOOKS ADICIONAIS ---
  // 1. Hook para buscar todos os planos de pagamento (para o dropdown do modal 'create')
  // Passamos 'user' e 'canFetch' como null/true, assumindo que se useUserFinancials
  // for chamado, o usuário tem permissão para ler planos.
  const { plans: availablePlans, isLoading: isLoadingPlans } = usePaymentPlans(
    user,
    true,
  );
  // 2. Hook para disparar a atualização de outros componentes
  const { triggerKpiRefetch } = useFinancialsDashboard();

  // (fetchAndHandle permanece o mesmo)
  const fetchAndHandle = async (url, options = {}) => {
    const response = await fetch(url);
    if (options.allow404 && response.status === 404) {
      return { status: 404, data: null };
    }
    return await handleApiResponse({
      response,
      router,
      setError,
      onSuccess: (data) => ({ status: 200, data }),
    });
  };

  // (fetchUserFinancials permanece o mesmo, com pequenas correções)
  const fetchUserFinancials = useCallback(
    async (username) => {
      if (!username) {
        clearSearch();
        return;
      }
      setIsLoading(true);
      setError(null);
      setUserFound(false);
      setFinancialData(null);
      setFoundUserId(null);

      try {
        const [userData, subscriptionData, paymentsData] = await Promise.all([
          fetchAndHandle(`${settings.global.API.ENDPOINTS.USERS}/${username}`, {
            allow404: true,
          }),
          fetchAndHandle(
            `${settings.global.API.ENDPOINTS.SUBSCRIPTIONS}?username=${username}`,
          ),
          fetchAndHandle(
            `${settings.global.API.ENDPOINTS.PAYMENTS}?username=${username}`,
          ),
        ]);

        if (!userData || userData.status === 404) {
          setError(`Usuário "${username}" não encontrado.`);
          setUserFound(false);
          setFinancialData(null);
          setFoundUserId(null);
          setIsLoading(false);
          return;
        }

        setUserFound(true);
        setFoundUserId(userData.id);

        const subscriptions = subscriptionData ? subscriptionData : [];
        const payments = paymentsData ? paymentsData : [];
        setFinancialData({
          subscriptions: subscriptions,
          payments: payments,
        });
      } catch (e) {
        setError("Erro de conexão. Verifique sua internet e tente novamente.");
        setUserFound(false);
        console.error("Erro ao buscar dados financeiros do usuário:", e);
        setTimeout(() => {
          setError(null);
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const clearSearch = useCallback(() => {
    setFinancialData(null);
    setUserFound(false);
    setError(null);
    setFoundUserId(null);
  }, []);

  // --- NOVAS FUNÇÕES DO MODAL ---
  const openSubModal = (mode, subscription = null) => {
    setSubModalMode(mode);
    setCurrentSubscription(subscription);
    setIsSubModalOpen(true);
    setModalError(null);
  };

  const closeSubModal = () => {
    setIsSubModalOpen(false);
    setCurrentSubscription(null);
    setModalError(null);
  };

  const createSubscription = async (formData) => {
    setModalError(null);
    try {
      const response = await fetch(
        settings.global.API.ENDPOINTS.SUBSCRIPTIONS,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      return await handleApiResponse({
        response,
        router,
        setError: setModalError, // Erro dentro do modal
        onSuccess: () => {
          triggerKpiRefetch(); // Atualiza KPIs e o próprio UserFinancials
          closeSubModal();
        },
      });
    } catch (e) {
      setModalError("Erro de conexão ao criar a assinatura.");
      setTimeout(() => {
        setModalError(null);
      }, 2000);
      console.error("Erro ao criar assinatura:", e);
    }
  };

  const updateSubscription = async (formData) => {
    setModalError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.SUBSCRIPTIONS}/${currentSubscription.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      return await handleApiResponse({
        response,
        router,
        setError: setModalError, // Erro dentro do modal
        onSuccess: () => {
          triggerKpiRefetch(); // Atualiza KPIs e o próprio UserFinancials
          closeSubModal();
        },
      });
    } catch (e) {
      setModalError("Erro de conexão ao atualizar a assinatura.");
      setTimeout(() => {
        setModalError(null);
      }, 2000);
      console.error("Erro ao atualizar assinatura:", e);
    }
  };

  const indicatePaid = useCallback(
    async (paymentId) => {
      setError(null);
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PAYMENTS}/${paymentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "indicate_paid" }),
          },
        );

        return await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (updatedPayment) => {
            // --- CORREÇÃO (Atualização de Estado Local) ---
            // Em vez de recarregar tudo, atualizamos apenas
            // o item de pagamento dentro do estado 'financialData'.
            setFinancialData((prevData) => {
              const newPayments = prevData.payments.map((p) =>
                p.id === paymentId ? { ...p, ...updatedPayment } : p,
              );
              return {
                ...prevData,
                payments: newPayments,
              };
            });

            // REMOVIDO: triggerKpiRefetch();
          },
        });
      } catch (e) {
        setError("Erro de conexão ao avisar o pagamento.");
        console.error("Erro ao avisar pagamento:", e);
      }
    },
    [router], // <-- REMOVIDO 'triggerKpiRefetch' das dependências
  );

  return {
    financialData,
    isLoading,
    error,
    userFound,
    foundUserId,
    fetchUserFinancials,
    clearSearch,
    availablePlans,
    isLoadingPlans, // <-- Expondo o loading dos planos
    isSubModalOpen,
    subModalMode,
    currentSubscription,
    modalError,
    openSubModal,
    closeSubModal,
    createSubscription,
    updateSubscription,
    indicatePaid,
  };
}
