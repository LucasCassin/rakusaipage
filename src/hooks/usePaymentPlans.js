import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";

export function usePaymentPlans(user, canFetch) {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Estados de UI para os Modais ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create', 'edit', 'delete'
  const [currentPlan, setCurrentPlan] = useState(null); // O plano selecionado para 'edit' ou 'delete'
  const [modalError, setModalError] = useState(null);

  // --- Função de Fetch Principal (Leitura) ---
  const fetchPlans = useCallback(async () => {
    if (!user || !canFetch) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(settings.global.API.ENDPOINTS.PAYMENT_PLANS);
      await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: (data) => {
          setPlans(data || []);
        },
        onFinally: () => {
          setIsLoading(false);
        },
      });
    } catch (e) {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      setIsLoading(false);
      console.error("Erro ao buscar planos de pagamento:", e);
    }
  }, [user, canFetch, router]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // --- Funções de Abertura/Fechamento dos Modais ---
  const openModal = (mode, plan = null) => {
    setModalMode(mode);
    setCurrentPlan(plan);
    setIsModalOpen(true);
    setModalError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentPlan(null);
    setModalError(null);
  };

  // --- Funções de Ação (Create, Update, Delete) ---

  const createPlan = async (planData) => {
    setModalError(null);
    try {
      const response = await fetch(
        settings.global.API.ENDPOINTS.PAYMENT_PLANS,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planData),
        },
      );

      return await handleApiResponse({
        response,
        router,
        setError: setModalError, // Erros aparecem DENTRO do modal
        onSuccess: (newPlan) => {
          setPlans((prev) => [...prev, newPlan]); // Adiciona à lista
          closeModal();
        },
      });
    } catch (e) {
      setModalError("Erro de conexão ao criar o plano.");
    }
  };

  const updatePlan = async (planData) => {
    setModalError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PAYMENT_PLANS}/${currentPlan.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planData),
        },
      );

      return await handleApiResponse({
        response,
        router,
        setError: setModalError, // Erros aparecem DENTRO do modal
        onSuccess: (updatedPlan) => {
          setPlans((prev) =>
            prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p)),
          );
          closeModal();
        },
      });
    } catch (e) {
      setModalError("Erro de conexão ao atualizar o plano.");
    }
  };

  const deletePlan = async () => {
    setModalError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PAYMENT_PLANS}/${currentPlan.id}`,
        {
          method: "DELETE",
        },
      );

      return await handleApiResponse({
        response,
        router,
        setError: setModalError, // Erros aparecem DENTRO do modal
        onSuccess: () => {
          setPlans((prev) => prev.filter((p) => p.id !== currentPlan.id));
          closeModal();
        },
      });
    } catch (e) {
      setModalError("Erro de conexão ao deletar o plano.");
    }
  };

  // --- Função de Estatísticas (para o Modal de Confirmação) ---

  const getPlanStats = async (planId) => {
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PAYMENT_PLANS_STATS}/${planId}/stats`,
      );
      // Usamos setError (geral) se falhar, pois não está em um modal
      return await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: (data) => data, // Retorna os dados (ex: { activeSubscriptions: 2 })
      });
    } catch (e) {
      setError("Erro de conexão ao buscar estatísticas do plano.");
      return null;
    }
  };

  return {
    // Dados e Estado
    plans,
    isLoading,
    error,

    // Estado do Modal
    isModalOpen,
    modalMode,
    currentPlan,
    modalError,

    // Funções de Ação
    openModal,
    closeModal,
    createPlan,
    updatePlan,
    deletePlan,
    getPlanStats,
  };
}
