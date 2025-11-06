import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse"; //
import { settings } from "config/settings";
import { useAuth } from "src/contexts/AuthContext";

/**
 * Hook para gerenciar o "Dashboard de Apresentações".
 * Lida com a busca da lista, criação e exclusão.
 * Baseado no 'usePaymentPlans.js'.
 */
export function usePresentationsDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  // Estado principal
  const [presentations, setPresentations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado dos Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentPresentation, setCurrentPresentation] = useState(null); // Para deleção
  const [modalError, setModalError] = useState(null);

  // 1. FUNÇÃO DE BUSCA (LEITURA)
  const fetchPresentations = useCallback(async () => {
    // A API 'GET /api/v1/presentations' só funciona para usuários logados.
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(settings.global.API.ENDPOINTS.PRESENTATIONS);
      await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: (data) => {
          setPresentations(data || []);
        },
      });
    } catch (e) {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      console.error("Erro ao buscar apresentações:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user, router]);

  // Busca inicial
  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  // 2. FUNÇÕES DE MODAL
  const openCreateModal = () => {
    setIsCreateModalOpen(true);
    setModalError(null);
  };

  const openDeleteModal = (presentation) => {
    setCurrentPresentation(presentation);
    setIsDeleteModalOpen(true);
    setModalError(null);
  };

  const closeModal = () => {
    setIsCreateModalOpen(false);
    setIsDeleteModalOpen(false);
    setCurrentPresentation(null);
    setModalError(null);
  };

  // 3. FUNÇÕES DE API (ESCRITA)

  // CRIAÇÃO
  const createPresentation = async (formData) => {
    setModalError(null);
    try {
      const response = await fetch(
        settings.global.API.ENDPOINTS.PRESENTATIONS,
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
        onSuccess: (newPresentation) => {
          // Adiciona à lista localmente
          setPresentations((prev) => [newPresentation, ...prev]);
          closeModal();
          // Redireciona para a página de edição.js]
          router.push(`/apresentacoes/${newPresentation.id}`);
        },
      });
    } catch (e) {
      setModalError("Erro de conexão ao criar apresentação.");
      console.error("Erro ao criar apresentação:", e);
    }
  };

  // DELEÇÃO
  const deletePresentation = async () => {
    if (!currentPresentation) return;
    setModalError(null);

    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${currentPresentation.id}`,
        {
          method: "DELETE",
        },
      );

      return await handleApiResponse({
        response,
        router,
        setError: setModalError, // Erro dentro do modal
        onSuccess: () => {
          // Remove da lista localmente
          setPresentations((prev) =>
            prev.filter((p) => p.id !== currentPresentation.id),
          );
          closeModal();
        },
      });
    } catch (e) {
      setModalError("Erro de conexão ao deletar apresentação.");
      console.error("Erro ao deletar apresentação:", e);
    }
  };

  return {
    // Dados e Estado
    presentations,
    isLoading,
    error,

    // Estado dos Modais
    isCreateModalOpen,
    isDeleteModalOpen,
    currentPresentation,
    modalError,

    // Funções de Ação
    openCreateModal,
    openDeleteModal,
    closeModal,
    createPresentation,
    deletePresentation,
  };
}
