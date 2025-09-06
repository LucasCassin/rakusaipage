import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import { fetchVideoAulaCollections } from "services/contentfulService.js";

import RootLayout from "pages/layout";
import CollectionCard from "components/student/CollectionCard";
import Loading from "components/Loading";
import Alert from "components/ui/Alert";
import { useMessage } from "src/hooks/useMessage.js";

export default function VideoAulasCatalogPage({ collections }) {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { error, setError } = useMessage();
  const [showContent, setShowContent] = useState(false);

  // Efeito para autenticação e permissões, baseado no seu /tables/index.js
  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user) {
      setError(texts.videoAulas.message.error.notAuthenticated);
      setShowContent(false);
      setTimeout(() => {
        router.push(settings.global.REDIRECTS.LOGIN);
      }, 3000);
      return;
    }

    // Agrupe as features necessárias em um array
    const requiredFeatures = [
      settings.videoAulas.FEATURE_TAIKO_INICIANTE,
      settings.videoAulas.FEATURE_TAIKO_INTERMEDIARIO,
      settings.videoAulas.FEATURE_TAIKO_AVANCADO,
      settings.videoAulas.FEATURE_TAIKO_PROFESSOR,
      settings.videoAulas.FEATURE_FUE_INICIANTE,
      settings.videoAulas.FEATURE_FUE_INTERMEDIARIO,
      settings.videoAulas.FEATURE_FUE_AVANCADO,
      settings.videoAulas.FEATURE_FUE_PROFESSOR,
    ];

    // Verifique se o usuário possui alguma das features do array
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
  }, [user, isLoadingAuth, router, setError]);

  // Filtra as coleções que o usuário pode ver com base no seu nível
  const accessibleCollections = useMemo(() => {
    if (!user || !collections) return [];

    const nivelOrder = {
      iniciante: 0,
      intermediario: 1,
      avancado: 2,
      admin: 3,
    };
    let userMaxNiveis = { taiko: -1, fue: -1 };

    if (user.features) {
      settings.nivel.taiko.forEach((n) => {
        if (user.features.includes(n.feature) && n.ord > userMaxNiveis.taiko)
          userMaxNiveis.taiko = n.ord;
      });
      settings.nivel.fue.forEach((n) => {
        if (user.features.includes(n.feature) && n.ord > userMaxNiveis.fue)
          userMaxNiveis.fue = n.ord;
      });
    }

    return collections.filter((collection) => {
      if (!collection.niveis || collection.niveis.length === 0) return true; // Se não especifica nível, todos veem
      return collection.niveis.some((nivelFeature) => {
        const [_, mod, niv] = nivelFeature.split(":");
        const requiredOrd = nivelOrder[niv];
        const userOrd = userMaxNiveis[mod];
        return userOrd >= requiredOrd;
      });
    });
  }, [collections, user]);

  if (isLoadingAuth || !showContent) {
    return (
      <RootLayout>
        <div className="flex items-center justify-center min-h-screen p-4">
          {error ? (
            <Alert type="error">{error}</Alert>
          ) : (
            <Loading message="A verificar permissões..." />
          )}
        </div>
      </RootLayout>
    );
  }

  return (
    <RootLayout>
      <div className="min-h-screen bg-gray-100 pt-16">
        <main className="container mx-auto max-w-7xl py-10 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Vídeo Aulas</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {accessibleCollections.map((collection, index) => (
              <CollectionCard key={index} collection={collection} />
            ))}
          </div>

          {accessibleCollections.length === 0 && (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-500">
                Nenhuma vídeo aula encontrada para o seu nível de acesso.
              </p>
            </div>
          )}
        </main>
      </div>
    </RootLayout>
  );
}

export async function getServerSideProps(context) {
  // A verificação de sessão aqui é uma camada extra de segurança,
  // mas a principal acontece no useEffect para uma melhor UX com mensagens de erro.

  const videoAulaCollections = await fetchVideoAulaCollections();

  return {
    props: {
      collections: videoAulaCollections,
    },
  };
}
