import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";
import { useAuth } from "src/contexts/AuthContext";

export function usePresentationsDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [presentations, setPresentations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [presentationToEdit, setPresentationToEdit] = useState(null);

  const [currentPresentation, setCurrentPresentation] = useState(null);
  const [modalError, setModalError] = useState(null);

  const fetchPresentations = useCallback(async () => {
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

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  const openCreateModal = () => {
    setPresentationToEdit(null);
    setIsCreateModalOpen(true);
    setModalError(null);
  };

  const openEditModal = (presentation) => {
    setPresentationToEdit(presentation);
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
    setPresentationToEdit(null);
    setModalError(null);
  };

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
        setError: setModalError,
        onSuccess: (newPresentation) => {
          setPresentations((prev) => [newPresentation, ...prev]);
          closeModal();
          router.push(`/apresentacoes/${newPresentation.id}`);
        },
      });
    } catch (e) {
      setModalError("Erro de conexão ao criar apresentação.");
      console.error("Erro ao criar apresentação:", e);
    }
  };

  const updatePresentation = async (id, formData) => {
    setModalError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      return await handleApiResponse({
        response,
        router,
        setError: setModalError,
        onSuccess: (updatedPresentation) => {
          setPresentations((prev) =>
            prev.map((p) => (p.id === id ? updatedPresentation : p)),
          );
          closeModal();
        },
      });
    } catch (e) {
      setModalError("Erro de conexão ao atualizar apresentação.");
      console.error("Erro ao atualizar apresentação:", e);
    }
  };

  const deletePresentation = async () => {
    if (!currentPresentation) return;
    setModalError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${currentPresentation.id}`,
        { method: "DELETE" },
      );
      return await handleApiResponse({
        response,
        router,
        setError: setModalError,
        onSuccess: () => {
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
    presentations,
    isLoading,
    error,
    isCreateModalOpen,
    isDeleteModalOpen,
    currentPresentation,
    presentationToEdit,
    modalError,
    openCreateModal,
    openEditModal,
    openDeleteModal,
    closeModal,
    createPresentation,
    updatePresentation,
    deletePresentation,
  };
}
