import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { mutate } from "swr";
import { USER_ENDPOINT, useAuth } from "src/contexts/AuthContext";
import { useView } from "src/contexts/ViewContext";
import { settings } from "config/settings.js";
import { handleApiResponse } from "src/utils/handleApiResponse.js";
import { texts } from "src/utils/texts.js";
import PageLayout from "components/layouts/PageLayout";
import LoadingSpinner from "components/ui/LoadingSpinner";
import Alert from "components/ui/Alert";
import { useMessage } from "src/hooks/useMessage.js";

export default function Logout() {
  const router = useRouter();
  const { user, isLoading: isLoadingUser } = useAuth();
  const { switchToPublic } = useView();
  const { error, setError } = useMessage();
  const [state, setState] = useState({
    showContent: true,
  });
  const logoutAttempted = useRef(false);

  const performLogout = async () => {
    if (logoutAttempted.current) return;
    logoutAttempted.current = true;

    try {
      const response = await fetch(settings.global.API.ENDPOINTS.SESSIONS, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      await handleApiResponse({
        response,
        router,
        setError,
        errorConfig: {
          ValidationSessionError: {
            action: () => {
              setState((prev) => ({ ...prev, showContent: false }));
              const previousPage =
                router.query.from || settings.auth.REDIRECT_AFTER_LOGOUT;
              router.push(previousPage);
            },
          },
          UnauthorizedError: {
            message: texts.logout.sessionEnded,
            action: () => {
              setState((prev) => ({ ...prev, showContent: false }));
              const previousPage =
                router.query.from || settings.auth.REDIRECT_AFTER_LOGOUT;
              router.push(previousPage);
            },
          },
          PasswordExpiredError: {
            action: () => {},
          },
        },
        onSuccess: async () => {
          switchToPublic();
          setState((prev) => ({ ...prev, showContent: false }));
          await mutate(USER_ENDPOINT);
          const previousPage =
            router.query.from || settings.auth.REDIRECT_AFTER_LOGOUT;
          router.push(previousPage);
        },
      });
    } catch (error) {
      setError(texts.logout.message.error.connection);
      console.error("Erro ao fazer logout:", error);
    }
  };

  useEffect(() => {
    if (isLoadingUser) return;

    if (!user) {
      const previousPage =
        router.query.from || settings.auth.REDIRECT_AFTER_LOGOUT;
      router.push(previousPage);
      return;
    }

    performLogout();
  }, [isLoadingUser, user]);

  return (
    <PageLayout title={texts.logout.title} description="Saindo da sua conta">
      {state.showContent && (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
            {!error && (
              <LoadingSpinner message={texts.logout.message.loading} />
            )}
            <Alert type="error" show={!!error}>
              {error}
            </Alert>

            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">
                {texts.logout.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {texts.logout.message.success}
              </p>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
