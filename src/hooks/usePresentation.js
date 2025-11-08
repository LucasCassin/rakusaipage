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
  const { user } = useAuth(); // Precisamos do usuário logado para a lógica de "Destaque"

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

      // --- CORREÇÃO AQUI ---
      // Movendo a lógica de 'setPresentation' para o 'onSuccess'
      // exatamente como você sugeriu.
      await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: (data) => {
          setPresentation(data);
        },
        // O handleApiResponse cuidará dos erros 401, 403, 404, etc.
      });
      // --- FIM DA CORREÇÃO ---
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
    presentation, // Os dados de findDeepById (com .scenes, .elements, etc.)
    setPresentation,
    isLoading,
    error,
    user, // Passamos o usuário logado para a UI (para a lógica do Destaque)
    fetchData, // Para o Admin poder forçar a atualização
  };
}
