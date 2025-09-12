import { texts } from "./texts.js";

export const handleApiResponse = async ({
  response,
  router,
  setError,
  setFieldErrors,
  onError,
  onSuccess,
  onFinally,
  fieldErrorMapping = {},
  errorConfig = {},
}) => {
  try {
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await response.text();
      console.error("--- ERRO FATAL: RESPOSTA NÃO É JSON ---");
      console.log("Status da Resposta:", response.status, response.statusText);
      console.log("URL da Requisição:", response.url);
      console.log("Conteúdo Recebido (HTML/Texto):", responseText); // <-- ISSO VAI MOSTRAR A PÁGINA HTML
      console.error("-----------------------------------------");
      setError?.(
        "Ocorreu um erro inesperado no servidor. A resposta não era JSON.",
      );
      onFinally?.(); // Chama onFinally para parar o loading
      return null; // Interrompe a execução aqui
    }
    const data = await response.json();

    if (!response.ok) {
      // Configuração padrão para os tipos de erro
      const defaultErrorConfig = {
        PasswordExpiredError: {
          message: data.message,
          action: () => {
            router.push("/profile/password?expired=true");
          },
        },
        ValidationError: {
          message: data.message,
          action: () => {
            if (setFieldErrors) {
              const fieldError = {};
              const errorMessage = data.message.replace(
                /["'](\w+)["']/g,
                (_, field) => fieldErrorMapping[field] || field,
              );

              Object.keys(fieldErrorMapping).forEach((field) => {
                if (data.message.toLowerCase().includes(field.toLowerCase())) {
                  fieldError[field] = errorMessage;
                }
              });

              setFieldErrors((prev) => ({
                ...prev,
                ...fieldError,
              }));
            }
          },
        },
        ForbiddenError: {
          message: data.message,
          action: () => {},
        },
        default: {
          message: data.message,
          action: () => {},
        },
      };

      // Obtém a configuração específica para o tipo de erro
      const errorType = data.name || "default";
      const currentErrorConfig = errorConfig[errorType] || {};
      const finalConfig = {
        ...(defaultErrorConfig[errorType] || defaultErrorConfig.default),
        ...currentErrorConfig,
      };

      // Define a mensagem de erro (prioriza a mensagem personalizada)
      if (setError) {
        // Verifica se é um erro de validação e se a mensagem contém algum campo mapeado
        const isFieldValidationError =
          errorType === "ValidationError" &&
          Object.keys(fieldErrorMapping).some((field) =>
            data.message.toLowerCase().includes(field.toLowerCase()),
          );

        // Só define o erro geral se não for um erro de validação de campo específico
        if (!isFieldValidationError) {
          setError(finalConfig.message);
        }
      }

      // Executa a ação (prioriza a ação personalizada)
      await finalConfig.action(data);

      // Executa o callback de erro geral, se fornecido
      onError?.(data);
      return null;
    }

    // Se chegou aqui, a resposta foi bem sucedida
    if (onSuccess) {
      await onSuccess(data);
    }

    return data;
  } catch (error) {
    setError?.(texts.apiResponse.error.connection);
    console.error("Erro ao processar resposta da API:", error);
    return null;
  } finally {
    onFinally?.();
  }
};
