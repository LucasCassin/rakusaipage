import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";

import CollectionCard from "components/student/CollectionCard";
import Loading from "components/Loading";
import Alert from "components/ui/Alert";
import { useMessage } from "src/hooks/useMessage.js";

export default function VideoAulaCatalog({ collections, pageConfig }) {
  const { title, defaultUrl, requiredFeatures } = pageConfig;

  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { error, setError } = useMessage();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setError(texts.videoAulas.message.error.notAuthenticated);
      setShowContent(false);
      setTimeout(() => router.push(settings.global.REDIRECTS.LOGIN), 3000);
      return;
    }

    const canAccess = requiredFeatures.some((feature) =>
      user.features?.includes(feature),
    );

    if (!canAccess) {
      setError(texts.videoAulas.message.error.noPermission);
      setShowContent(false);
      router.push(settings.global.REDIRECTS.HOME);
      return;
    }

    setShowContent(true);
  }, [user, isLoadingAuth, router, setError, requiredFeatures]);

  const accessibleCollections = useMemo(() => {
    if (!user || !user.features || !collections) return [];
    return collections.filter((collection) => {
      if (collection.type !== pageConfig.type) {
        return false;
      }
      if (!collection.niveis || collection.niveis.length === 0) {
        return true;
      }
      return collection.niveis.some((requiredFeature) =>
        user.features.includes(requiredFeature),
      );
    });
  }, [collections, user, pageConfig.type]);

  if (isLoadingAuth || !showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        {error ? (
          <Alert type="error">{error}</Alert>
        ) : (
          <Loading message="Verificando permissões..." />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-16">
      <main className="container mx-auto max-w-7xl py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{title}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {accessibleCollections.map((collection, index) => (
            <CollectionCard
              key={index}
              collection={collection}
              defaultURL={defaultUrl}
            />
          ))}
        </div>
        {accessibleCollections.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-500">
              Nenhuma vídeoaula encontrada para o seu nível de acesso.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
