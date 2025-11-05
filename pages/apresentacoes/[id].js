import { useRouter } from "next/router";
import { useState, useEffect, useMemo } from "react"; // <-- MUDANÇA
import { usePresentation } from "src/hooks/usePresentation"; //

import PageLayout from "components/layouts/PageLayout";
import InitialLoading from "components/InitialLoading";
import ErrorPage from "components/ui/ErrorPage";
import Button from "components/ui/Button";
import { texts } from "src/utils/texts";

// --- NOVOS IMPORTS ---
import SceneSelector from "components/presentation/SceneSelector"; //
import StageView from "components/presentation/StageView"; //

export default function PresentationPage() {
  const router = useRouter();
  const { id: presentationId } = router.query;

  const { presentation, isLoading, error, user } =
    usePresentation(presentationId);

  // --- MUDANÇA: Estado para controlar a cena ativa ---
  const [currentSceneId, setCurrentSceneId] = useState(null);

  // Define a cena inicial (a primeira da lista) assim que a apresentação carregar
  useEffect(() => {
    if (presentation?.scenes && presentation.scenes.length > 0) {
      setCurrentSceneId(presentation.scenes[0].id);
    }
  }, [presentation]);

  // Encontra o objeto da cena completa com base no ID ativo
  const currentScene = useMemo(() => {
    if (!presentation || !currentSceneId) return null;
    return presentation.scenes.find((s) => s.id === currentSceneId);
  }, [presentation, currentSceneId]);
  // --- FIM DA MUDANÇA ---

  // 1. Estado de Carregamento
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <InitialLoading message="Carregando apresentação..." />
      </div>
    );
  }

  // 2. Estado de Erro (403, 404, 500)
  if (error) {
    return (
      <ErrorPage
        title="Acesso Negado"
        message={error || "Você não tem permissão para ver esta apresentação."}
        buttons={[
          {
            text: texts.errorPages.notFound.button,
            onClick: () => router.push("/"),
            variant: "primary",
          },
        ]}
      />
    );
  }

  // 3. Estado de Sucesso
  return (
    <PageLayout
      title={presentation?.name || "Apresentação"}
      description={`Mapa de palco para ${presentation?.name || "apresentação"}.`}
      maxWidth="max-w-6xl"
    >
      <div className="p-4">
        {/* TODO: Aqui é onde o "Modo Editor" apareceria */}
        {/* <AdminToolbar /> */}

        <h1 className="text-3xl font-bold mb-2">{presentation.name}</h1>
        <p className="text-gray-600 mb-6">{presentation.description}</p>

        {/* --- MUDANÇA: Placeholders substituídos --- */}
        <SceneSelector
          scenes={presentation.scenes}
          currentSceneId={currentSceneId}
          onSelectScene={setCurrentSceneId} // Passa o "setter"
        />

        <StageView
          scene={currentScene} // Passa o objeto da cena ativa
          loggedInUser={user} // Passa o usuário para a "Mágica do Destaque"
        />
        {/* --- FIM DA MUDANÇA --- */}
      </div>
    </PageLayout>
  );
}
