import { useState, useEffect, useCallback } from "react";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings.js";

/**
 * Hook "cérebro" para gerenciar o ELENCO (viewers) de uma apresentação.
 * Ele lida com fetch, add e remove.
 */
export function usePresentationCast(
  presentationId,
  canReadCast,
  router,
  onStateChange,
) {
  const [viewers, setViewers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. BUSCAR O ELENCO ATUAL
  const fetchViewers = useCallback(async () => {
    if (!presentationId || !canReadCast) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/viewers`,
      );
      await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: (data) => {
          setViewers(data || []);
        },
      });
    } catch (e) {
      setError("Erro de conexão ao buscar elenco.");
      console.error("Erro de conexão ao buscar elenco:", e);
    } finally {
      setIsLoading(false);
    }
  }, [presentationId, canReadCast, router]);

  // Efeito para buscar o elenco quando o hook é montado
  useEffect(() => {
    fetchViewers();
  }, [fetchViewers]);

  // 2. ADICIONAR UM MEMBRO AO ELENCO
  const addUserToCast = useCallback(
    async (userId) => {
      setError(null);
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/viewers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId }),
          },
        );

        await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: async (newViewer) => {
            if (
              newViewer &&
              newViewer.message !== "Usuário já estava no elenco."
            ) {
              await onStateChange(); // <-- Chama o GATILHO
              return true;
            }
            return false;
          },
        });
      } catch (e) {
        setError("Erro de conexão ao adicionar usuário.");
        console.error("Erro de conexão ao adicionar usuário:", e);
        return false;
      }
    },
    [presentationId, router, fetchViewers, onStateChange],
  );

  // 3. REMOVER UM MEMBRO DO ELENCO
  const removeUserFromCast = useCallback(
    async (userId) => {
      setError(null);
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/viewers/${userId}`,
          {
            method: "DELETE",
          },
        );

        await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: async () => {
            await onStateChange();
            // Sucesso, atualiza a lista local
            //setViewers((prev) => prev.filter((v) => v.id !== userId));
          },
        });
      } catch (e) {
        setError("Erro de conexão ao remover usuário.");
        console.error("Erro de conexão ao remover usuário:", e);
      }
    },
    [presentationId, router, onStateChange],
  );

  return {
    viewers,
    isLoading,
    error,
    fetchViewers,
    addUserToCast,
    removeUserFromCast,
  };
}
