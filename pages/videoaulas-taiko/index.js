import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import { fetchVideoAulaCollections } from "services/contentfulService.js";

import CollectionCard from "components/student/CollectionCard";
import Loading from "components/Loading";
import Alert from "components/ui/Alert";
import { useMessage } from "src/hooks/useMessage.js";

async function processYouTubeLink(link, apiKey) {
  try {
    const url = new URL(link);
    const playlistId = url.searchParams.get("list");
    const videoId = url.searchParams.get("v");

    if (playlistId) {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=id&maxResults=50&playlistId=${playlistId}&key=${apiKey}`,
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.items || [];
    } else if (videoId) {
      return [{ videoId }]; // Retorna um array com um item se for um vídeo único
    }
    return [];
  } catch (error) {
    console.error(`Erro ao processar link do YouTube (${link}):`, error);
    return [];
  }
}

export default function VideoAulasCatalogPage({ collections }) {
  const DEFAULT_URL = "videoaulas-taiko";
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
      // settings.videoAulas.FEATURE_FUE_INICIANTE,
      // settings.videoAulas.FEATURE_FUE_INTERMEDIARIO,
      // settings.videoAulas.FEATURE_FUE_AVANCADO,
      // settings.videoAulas.FEATURE_FUE_PROFESSOR,
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
    if (!user || !user.features || !collections) return [];

    return collections.filter((collection) => {
      // 1. Filtra para mostrar apenas coleções do tipo 'taiko'
      if (collection.type !== "taiko") {
        return false;
      }

      // 2. Se a coleção não exige nenhuma feature de nível, mostra para todos
      if (!collection.niveis || collection.niveis.length === 0) {
        return true;
      }

      // 3. Verifica se o usuário tem PELO MENOS UMA das features exigidas
      return collection.niveis.some((requiredFeature) =>
        user.features.includes(requiredFeature),
      );
    });
  }, [collections, user]);

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
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Vídeoaulas Taiko
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {accessibleCollections.map((collection, index) => (
            <CollectionCard
              key={index}
              collection={collection}
              defaultURL={DEFAULT_URL}
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

export async function getServerSideProps() {
  const youtubeApiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  let collections = await fetchVideoAulaCollections();

  // MUDANÇA: Processa as coleções no servidor para adicionar a contagem de vídeos
  if (youtubeApiKey && collections) {
    collections = await Promise.all(
      collections.map(async (collection) => {
        // Busca os vídeos de todos os links da coleção
        const videoArrays = await Promise.all(
          collection.youtubeLinks.map((link) =>
            processYouTubeLink(link, youtubeApiKey),
          ),
        );
        // Junta todos os vídeos encontrados e adiciona à coleção
        const videos = videoArrays.flat().filter(Boolean);
        return { ...collection, videos };
      }),
    );
  }

  return {
    props: {
      collections,
      // Não precisamos mais passar a chave da API para o cliente
    },
  };
}
