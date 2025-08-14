import { useState, useCallback } from "react";
import { handleApiResponse } from "src/utils/handleApiResponse.js";

/**
 * Hook personalizado para gerenciar a submissão de formulários
 * @param {Object} options Opções para configurar o comportamento do hook
 * @param {Object} messageHook Hook de mensagens (useMessage)
 * @returns {Object} Objeto com métodos e propriedades para submissão do formulário
 */
export function useFormSubmit(options = {}) {
  const {
    url,
    method = "POST",
    successRedirect,
    successMessage,
    setFieldErrorsHandlers = {},
    onSuccess,
    onError,
    router,
    validateBeforeSubmit,
    messageHook = null,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const {
    setFieldErrors,
    setFieldError,
    clearAllFieldError,
    fieldErrorMapping,
  } = setFieldErrorsHandlers;

  const submitForm = useCallback(
    async (formData) => {
      // Limpar mensagens anteriores
      if (messageHook) {
        messageHook.clearAll();
      }

      if (setFieldErrorsHandlers) {
        clearAllFieldError();
      }

      // Validação personalizada antes do envio
      if (validateBeforeSubmit) {
        const validationResult = validateBeforeSubmit(formData);
        if (!validationResult.isValid) {
          if (validationResult.errors && setFieldErrorsHandlers) {
            for (const [field, error] of Object.entries(
              validationResult.errors,
            )) {
              setFieldError(field, error);
            }
          }
          if (validationResult.message) {
            messageHook?.setError(validationResult.message);
          }
          return false;
        }
      }

      setIsLoading(true);

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const result = await handleApiResponse({
          response,
          router,
          setError: messageHook?.setError,
          setFieldErrors,
          fieldErrorMapping,
          onSuccess: (data) => {
            if (successMessage) {
              messageHook?.setSuccess(successMessage);
            }

            if (successRedirect) {
              setTimeout(() => {
                router.push(successRedirect);
              }, 2000);
            }

            if (onSuccess) {
              onSuccess(data);
            }
          },
          onFinally: () => {
            setIsLoading(false);
          },
          onError,
        });

        return result !== null;
      } catch (error) {
        messageHook?.setError(
          "Erro de conexão. Verifique sua internet e tente novamente.",
        );
        setIsLoading(false);
        console.error("Erro ao enviar formulário:", error);
        return false;
      }
    },
    [
      url,
      method,
      router,
      successRedirect,
      successMessage,
      fieldErrorMapping,
      onSuccess,
      onError,
      validateBeforeSubmit,
      messageHook,
    ],
  );

  return {
    submitForm,
    isLoading,
  };
}
