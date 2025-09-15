import { useState, useCallback } from "react";
import { settings } from "config/settings.js";
import { handleApiResponse } from "src/utils/handleApiResponse.js";
import { useMessage } from "src/hooks/useMessage.js"; //

export function useUserSearchByFeatures() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { error, setError, clearError } = useMessage(); //
  const [hasSearched, setHasSearched] = useState(false);

  const searchUsers = useCallback(
    async (features) => {
      if (!features || features.length === 0) {
        setError("Por favor, selecione ao menos uma feature para buscar."); //
        return;
      }

      setIsLoading(true);
      clearError(); //
      setUsers([]);
      setHasSearched(true);

      const params = new URLSearchParams();
      features.forEach((feature) => params.append("features", feature));
      const url = `${settings.global.API.ENDPOINTS.USERS}?${params.toString()}`;

      try {
        const response = await fetch(url);

        await handleApiResponse({
          response,
          setError, //
          onSuccess: async (data) => {
            setUsers(data || []);
          },
          onError: () => {
            setUsers([]);
          },
        });
      } catch (err) {
        setError(
          "Falha ao conectar com o servidor. Tente novamente mais tarde.",
        ); //
        console.log("Erro ao buscar usuários:", err);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    },
    [setError, clearError],
  ); //

  const clearSearch = useCallback(() => {
    setUsers([]);
    setHasSearched(false);
    clearError();
  }, [clearError]);

  return { users, isLoading, error, hasSearched, searchUsers, clearSearch };
}
