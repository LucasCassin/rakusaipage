import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { handleApiResponse } from "src/utils/handleApiResponse.js";
import { texts } from "src/utils/texts.js";
import Alert from "components/ui/Alert";
import MigrationsList from "./MigrationsList";
import MigrationsActions from "./MigrationsActions";
import { useMessage } from "src/hooks/useMessage.js";

export default function MigrationsContent() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();

  const [state, setState] = useState({
    pendingMigrations: [],
    isLoading: false,
    permissions: {
      canRead: false,
      canCreate: false,
    },
    showContent: true,
  });

  const { error, setError, success, setSuccess, clearError, clearSuccess } =
    useMessage();

  const fetchPendingMigrations = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
    }));
    clearSuccess();
    clearError();

    try {
      const response = await fetch(settings.global.API.ENDPOINTS.MIGRATIONS);

      await handleApiResponse({
        response,
        router,
        setError: (error) => setState((prev) => ({ ...prev, error })),
        errorConfig: {
          default: {
            action: () => {
              setState((prev) => ({ ...prev, pendingMigrations: [] }));
            },
          },
        },
        onSuccess: async (data) => {
          setState((prev) => ({
            ...prev,
            pendingMigrations: data,
          }));
          data.length === 0
            ? setSuccess(texts.migrations.message.noMigrations)
            : clearSuccess();
        },
        onFinally: () => {
          setState((prev) => ({ ...prev, isLoading: false }));
        },
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
      setError(texts.migrations.message.error.connection);
      console.error("Erro ao buscar migrações pendentes:", error);
    }
  }, [router]);

  const executeMigrations = async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
    }));
    clearSuccess();
    clearError();

    try {
      const response = await fetch(settings.global.API.ENDPOINTS.MIGRATIONS, {
        method: "POST",
      });

      await handleApiResponse({
        response,
        router,
        setError,
        onSuccess: async () => {
          setSuccess(texts.migrations.message.runSuccess);
          await fetchPendingMigrations();
        },
        onFinally: () => {
          setState((prev) => ({ ...prev, isLoading: false }));
        },
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
      setError(texts.migrations.message.error.connection);
      console.error("Erro ao executar migrações:", error);
    }
  };

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setState((prev) => ({
        ...prev,
        showContent: false,
      }));
      setError(texts.migrations.message.error.notAuthenticated);
      setTimeout(() => {
        router.push(settings.global.REDIRECTS.LOGIN);
      }, 2000);
      return;
    }

    const userPermissions = {
      canRead: user.features?.includes(
        settings.migrations.FEATURE_READ_MIGRATIONS,
      ),
      canCreate: user.features?.includes(
        settings.migrations.FEATURE_CREATE_MIGRATIONS,
      ),
    };

    setState((prev) => ({
      ...prev,
      permissions: userPermissions,
    }));

    if (!userPermissions.canRead && !userPermissions.canCreate) {
      setState((prev) => ({
        ...prev,
        showContent: false,
      }));
      setError(texts.migrations.message.error.noPermission);
      router.push(settings.migrations.FORBIDDEN_REDIRECT);
      return;
    }

    if (!userPermissions.canRead && userPermissions.canCreate) {
      setState((prev) => ({
        ...prev,
        showContent: false,
      }));
      setError(texts.migrations.message.error.noPermissionRead);
      router.push(settings.migrations.FORBIDDEN_REDIRECT);
      return;
    }

    if (userPermissions.canRead) {
      fetchPendingMigrations();
    }
  }, [user, router, isLoadingAuth, fetchPendingMigrations]);

  if (!state.showContent) {
    return null;
  }

  return (
    // Container principal agora é um flexbox que centraliza seu conteúdo
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Este é o seu bloco de conteúdo, que agora será centralizado pelo pai */}
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {texts.migrations.title}
          </h2>
        </div>

        <Alert type="error" show={!!error}>
          {error}
        </Alert>

        <Alert type="success" show={!!success}>
          {success}
        </Alert>

        {(state.permissions.canRead || state.permissions.canCreate) &&
          !error && (
            <div className="bg-white shadow rounded-lg p-6 space-y-6">
              <MigrationsActions
                canRead={state.permissions.canRead}
                canCreate={state.permissions.canCreate}
                isLoading={state.isLoading}
                pendingMigrations={state.pendingMigrations}
                onCheck={fetchPendingMigrations}
                onExecute={executeMigrations}
              />

              {state.permissions.canRead &&
                state.pendingMigrations.length > 0 && (
                  <MigrationsList migrations={state.pendingMigrations} />
                )}
            </div>
          )}
      </div>
    </div>
  );
}
