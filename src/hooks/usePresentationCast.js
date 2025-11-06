import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings.js";

/**
 * Hook "cérebro" para gerenciar o ELENCO (viewers) de uma apresentação.
 * Ele lida com fetch, add e remove.
 */
export function usePresentationCast(presentationId, permissions) {
  const router = useRouter();
  const [viewers, setViewers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const canReadCast = permissions?.canReadCast;

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

        const result = await handleApiResponse({
          response,
          router,
          setError,
          onSuccess: (newViewer) => newViewer,
        });

        if (result && result.message !== "Usuário já estava no elenco.") {
          // Sucesso, atualiza a lista local
          await fetchViewers(); // Recarrega a lista
          return true;
        }
        return false;
      } catch (e) {
        setError("Erro de conexão ao adicionar usuário.");
        console.error("Erro de conexão ao adicionar usuário:", e);
        return false;
      }
    },
    [presentationId, router, fetchViewers],
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
          onSuccess: () => {
            // Sucesso, atualiza a lista local
            setViewers((prev) => prev.filter((v) => v.id !== userId));
          },
        });
      } catch (e) {
        setError("Erro de conexão ao remover usuário.");
        console.error("Erro de conexão ao remover usuário:", e);
      }
    },
    [presentationId, router],
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
