import { useState, useCallback } from "react";

/**
 * Hook personalizado para buscar e gerenciar usuários
 * @param {Object} options - Opções de configuração
 * @returns {Object} Objeto com estado e funções para busca de usuários
 */
export function useSetFieldError(options = {}) {
  const { fieldErrorMapping = {} } = options;

  const [fieldErrors, setFieldErrors] = useState({});

  /**
   * Busca um usuário pelo username
   * @param {string} field - Nome do campo a ser buscado
   * @param {string} error - Mensagem de erro a ser setada
   */
  const setFieldError = useCallback(
    async (field, error = "") => {
      if (!field) return;

      if (error === "") {
        setFieldErrors((prev) => {
          const newFieldErrors = { ...prev };
          delete newFieldErrors[field];
          return newFieldErrors;
        });
        return;
      }
      const fieldError = {};
      const errorMessage = error.replace(
        /["'](\w+)["']/g,
        (_, field) => fieldErrorMapping[field] || field,
      );

      if (error.toLowerCase().includes(field.toLowerCase())) {
        fieldError[field] = errorMessage;
      }

      setFieldErrors((prev) => ({
        ...prev,
        ...fieldError,
      }));
    },
    [fieldErrorMapping],
  );

  const clearAllFieldError = useCallback(() => {
    setFieldErrors({});
  }, []);

  return {
    fieldErrors,
    setFieldError,
    setFieldErrors,
    clearAllFieldError,
    fieldErrorMapping,
  };
}
