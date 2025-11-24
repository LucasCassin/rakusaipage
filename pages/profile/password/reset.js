import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import PublicHeader from "components/PublicHeader";
import PasswordForm from "components/forms/PasswordForm";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import { usePasswordHook } from "src/hooks/usePasswordHook";
import { useMessage } from "src/hooks/useMessage";
import { useSetFieldError } from "src/hooks/useSetFieldError";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { texts } from "src/utils/texts";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;

  const { error, setError, clearError, success, setSuccess } = useMessage();

  const passwordHook = usePasswordHook("", true);

  const { fieldErrors, setFieldErrors, clearAllFieldError } = useSetFieldError({
    fieldErrorMapping: texts.profilePassword.errorMapping,
  });

  const [state, setState] = useState({
    isLoading: false,
    showPassword: false,
    isTokenMissing: false,
  });

  useEffect(() => {
    if (router.isReady && !token) {
      setState((prev) => ({ ...prev, isTokenMissing: true }));
      setError("Link inválido ou incompleto. Verifique o e-mail recebido.");
    }
  }, [router.isReady, token, setError]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwordHook.isValid) {
      setError(texts.profilePassword.message.error.criteria);
      return;
    }

    clearError();
    clearAllFieldError();
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch("/api/v1/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_model: token,
          password: passwordHook.password,
        }),
      });

      await handleApiResponse({
        response,
        router,
        setError,
        setFieldErrors,
        onSuccess: () => {
          setSuccess(
            "Senha alterada com sucesso! Redirecionando para o login...",
          );
          passwordHook.reset();
          setTimeout(() => {
            router.push("/login");
          }, 3000);
        },
        onFinally: () => {
          setState((prev) => ({ ...prev, isLoading: false }));
        },
      });
    } catch (error) {
      console.error(error);
      setError(texts.apiResponse.error.connection);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const pageTexts = {
    ...texts.profilePassword,
    title: "Definir Nova Senha",
    button: {
      ...texts.profilePassword.button,
      submit: "Redefinir Senha",
    },
  };

  return (
    <div className="min-h-screen bg-rakusai-gray-light flex flex-col">
      <PublicHeader />

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-rakusai-gray-dark mb-2">
              {pageTexts.title}
            </h1>
            <p className="text-gray-600 text-sm">
              Crie uma nova senha forte para sua conta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Alert type="error" show={!!error}>
              {error}
            </Alert>
            <Alert type="success" show={!!success}>
              {success}
            </Alert>

            {!success && !state.isTokenMissing && (
              <>
                {/* Componente reutilizado de Senha (inclui input, toggle visibilidade e gerador) */}
                <PasswordForm
                  fieldErrors={fieldErrors}
                  setFieldErrors={setFieldErrors}
                  disabled={state.isLoading}
                  passwordHook={passwordHook}
                  texts={pageTexts}
                  showPassword={state.showPassword}
                  setShowPassword={(show) =>
                    setState((prev) => ({ ...prev, showPassword: show }))
                  }
                  showSubmitButton={false}
                  showGeneratePasswordButton={true}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-4"
                  disabled={state.isLoading || !passwordHook.isValid}
                >
                  {state.isLoading
                    ? pageTexts.button.loading
                    : pageTexts.button.submit}
                </Button>
              </>
            )}
          </form>

          <div className="text-center text-sm mt-4">
            <Link href="/login" className="text-rakusai-purple hover:underline">
              Voltar para o Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
