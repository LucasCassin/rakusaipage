import { useState, useCallback } from "react";
import { settings } from "config/settings.js";
import { handleApiResponse } from "src/utils/handleApiResponse.js";
import { useRouter } from "next/navigation";

/**
 * Hook personalizado para buscar e gerenciar usuários
 * @param {Object} options - Opções de configuração
 * @returns {Object} Objeto com estado e funções para busca de usuários
 */
export function useUserSearch(options = {}) {
  const {
    resetCallback,
    onBeforeFetchCallback,
    onSuccessCallback,
    onFinallyCallback,
    onErrorCallback,
    messageHandlers = {},
    setFieldErrorsHandlers = {},
  } = options;

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [userFound, setUserFound] = useState(false);

  const { setError, clearError } = messageHandlers;
  const { setFieldErrors, clearAllFieldError, fieldErrorMapping } =
    setFieldErrorsHandlers;

  /**
   * Busca um usuário pelo username
   * @param {string} username - Nome do usuário a ser buscado
   */
  const fetchUserData = useCallback(
    async (username) => {
      if (!username) return;

      setIsLoading(true);
      setUserFound(false);
      clearAllFieldError();
      clearError?.();

      if (onBeforeFetchCallback) onBeforeFetchCallback();

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.USERS}/${username}`,
        );

        await handleApiResponse({
          response,
          router,
          setError,
          setFieldErrors,
          fieldErrorMapping,
          errorConfig: {
            default: {
              action: () => {
                if (resetCallback) resetCallback();
                setUserFound(false);
              },
            },
          },
          onSuccess: async (data) => {
            setUserFound(true);
            if (onSuccessCallback) onSuccessCallback(data);
          },
          onError: (error) => {
            if (onErrorCallback) onErrorCallback(error);
          },
          onFinally: () => {
            setIsLoading(false);
            if (onFinallyCallback) onFinallyCallback();
          },
        });
      } catch (error) {
        setError?.(
          "Erro de conexão. Verifique sua internet e tente novamente.",
        );
        setUserFound(false);
        setIsLoading(false);
        console.error("Erro ao buscar usuário:", error);
      }
    },
    [
      router,
      resetCallback,
      onSuccessCallback,
      fieldErrorMapping,
      messageHandlers,
    ],
  );

  return {
    isLoading,
    setIsLoading,
    userFound,
    setUserFound,
    setFieldErrors,
    fetchUserData,
  };
}
