import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings.js";
import { useAuth } from "src/contexts/AuthContext";

/**
 * Hook para buscar e gerenciar os dados de uma única apresentação.
 */
export function usePresentation(presentationId) {
  const router = useRouter();
  const { user } = useAuth();

  const [presentation, setPresentation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!presentationId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}`,
      );

      await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: (data) => {
          setPresentation(data);
        },
      });
    } catch (e) {
      console.error("Erro de conexão ao buscar apresentação:", e);
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [presentationId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    presentation,
    setPresentation,
    isLoading,
    error,
    user,
    fetchData,
  };
}
