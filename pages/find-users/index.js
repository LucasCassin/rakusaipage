import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import useUrlManager from "src/hooks/useUrlManager"; //

import PageLayout from "components/layouts/PageLayout";
import Alert from "components/ui/Alert";
import InitialLoading from "components/InitialLoading";
import FeatureSelectionForm from "components/forms/FeatureSelectionForm";
import UserList from "components/ui/UserList";
import UserListSkeleton from "components/ui/UserListSkeleton";

import { useUserSearchByFeatures } from "src/hooks/useUserSearchByFeatures";

export default function FindUsersPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [authError, setAuthError] = useState(null);

  const { updateUrl, getParamValue } = useUrlManager(); //
  const {
    users,
    isLoading,
    error: searchError,
    hasSearched,
    searchUsers,
    clearSearch,
  } = useUserSearchByFeatures();

  // Lê as features da URL para o estado inicial
  const initialFeaturesFromUrl = useMemo(() => {
    const featuresParam = getParamValue("features"); //
    return featuresParam ? featuresParam.split(",") : [];
  }, [getParamValue]); //

  // Efeito de autenticação e busca inicial a partir da URL
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setAuthError(texts.findUser.message.error.notAuthenticated);
      setTimeout(() => {
        router.push(settings.global.REDIRECTS.LOGIN);
      }, 2000);
      return;
    }

    const canAccess = user.features?.includes("read:user:other");

    if (!canAccess) {
      setAuthError(texts.findUser.message.error.noPermission);
      setTimeout(() => {
        router.push(settings.global.REDIRECTS.HOME);
      }, 2000);
      return;
    }

    setShowContent(true);

    // Se houver features na URL, executa a busca inicial
    if (initialFeaturesFromUrl.length > 0) {
      searchUsers(initialFeaturesFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoadingAuth, router]);

  // Handler que conecta o formulário com o hook de busca e a URL
  const handleSearch = (features) => {
    // 1. Atualiza a URL com os novos parâmetros
    updateUrl("features", features.join(",")); //

    // 2. Executa a busca
    searchUsers(features);
  };

  const handleParamsChange = () => {
    clearSearch();
    updateUrl("features", "");
  };

  if (isLoadingAuth || !showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        {authError ? (
          <Alert type="error">{authError}</Alert>
        ) : (
          <InitialLoading message="Verificando permissões..." />
        )}
      </div>
    );
  }

  return (
    <PageLayout
      title={texts.findUser.title}
      description={texts.findUser.description}
      maxWidth="max-w-4xl"
    >
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Buscar Usuários
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Selecione um grupo predefinido ou escolha features específicas para
          encontrar usuários.
        </p>
      </div>

      <div className="mt-8">
        <FeatureSelectionForm
          onSearch={handleSearch}
          isLoading={isLoading}
          initialFeatures={initialFeaturesFromUrl}
          onParamsChange={handleParamsChange}
        />
      </div>

      {searchError && (
        <div className="mt-8">
          <Alert type="error">{searchError}</Alert>
        </div>
      )}

      {isLoading && <UserListSkeleton />}
      {!isLoading && hasSearched && <UserList users={users} />}
    </PageLayout>
  );
}
