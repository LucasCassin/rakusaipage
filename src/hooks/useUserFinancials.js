import { useState, useCallback } from "react"; // Removido useEffect não utilizado
import { useRouter } from "next/router";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings";

export function useUserFinancials() {
  const router = useRouter();
  const [financialData, setFinancialData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userFound, setUserFound] = useState(false);

  // Helper interno para encapsular a lógica de fetch + handleApiResponse
  const fetchAndHandle = async (url) => {
    const response = await fetch(url);
    // Passa o setError principal. Se qualquer chamada falhar, o erro será setado.
    return handleApiResponse({
      response,
      router,
      setError,
      onSuccess: (data) => data, // Em caso de sucesso, apenas retorna os dados
    });
  };

  const fetchUserFinancials = useCallback(
    async (username) => {
      if (!username) {
        clearSearch();
        return;
      }

      setIsLoading(true);
      setError(null);
      setUserFound(false);
      setFinancialData(null); // Limpa dados anteriores

      try {
        // Busca assinaturas e pagamentos em paralelo
        const [subscriptionData, paymentsData] = await Promise.all([
          fetchAndHandle(
            `${settings.global.API.ENDPOINTS.SUBSCRIPTIONS}?username=${username}`,
          ),
          fetchAndHandle(
            `${settings.global.API.ENDPOINTS.PAYMENTS}?username=${username}`,
          ),
        ]);

        // handleApiResponse retorna null em caso de erro
        // Só continuamos se AMBAS as chamadas tiverem sucesso
        if (subscriptionData !== null && paymentsData !== null) {
          // A API de subscriptions retorna um array, pegamos o primeiro item
          const subscription =
            subscriptionData.length > 0 ? subscriptionData[0] : null;

          setFinancialData({
            subscription: subscription,
            payments: paymentsData,
          });
          setUserFound(true);
        } else {
          // Se "null", um erro já foi setado pelo handleApiResponse
          setUserFound(false);
          setFinancialData(null);
        }
      } catch (e) {
        // Erro de conexão (ex: rede)
        setError("Erro de conexão. Verifique sua internet e tente novamente.");
        setUserFound(false);
        console.error("Erro ao buscar dados financeiros do usuário:", e);
      } finally {
        setIsLoading(false);
      }
    },
    [router], // Adicionado router como dependência
  );

  const clearSearch = useCallback(() => {
    setFinancialData(null);
    setUserFound(false);
    setError(null);
  }, []);

  return {
    financialData,
    isLoading,
    error,
    userFound,
    fetchUserFinancials,
    clearSearch,
  };
}
