import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse"; // Importado
import { settings } from "config/settings";

export function usePaymentPlans(user, canFetch) {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlans = useCallback(async () => {
    if (!user || !canFetch) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Usando o endpoint que já estava sendo referenciado em index.js
      const response = await fetch(settings.global.API.ENDPOINTS.PAYMENT_PLANS);

      // Usando o handleApiResponse para processar a resposta
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
      // Captura erros de conexão (ex: rede) que o fetch pode lançar
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      setIsLoading(false);
      console.error("Erro ao buscar planos de pagamento:", e);
    }
  }, [user, canFetch, router]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    isLoading,
    error,
    refetchPlans: fetchPlans,
  };
}
