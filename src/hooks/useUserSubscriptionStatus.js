import { useState, useEffect, useCallback } from "react";
import { settings } from "config/settings";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { useRouter } from "next/router";

export function useUserSubscriptionStatus() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        settings.global.API.ENDPOINTS.USERS_SUB_STATUS,
      );
      await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: (data) => {
          setUsers(data || []);
        },
      });
    } catch (e) {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
      console.error("Erro ao buscar apresentações:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    users,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
