import { useRouter } from "next/router";
import { useMemo } from "react";
import { usePresentationEditor } from "src/hooks/usePresentationEditor";

import PageLayout from "components/layouts/PageLayout";
import InitialLoading from "components/InitialLoading";
import ErrorPage from "components/ui/ErrorPage";
import Button from "components/ui/Button";
import { texts } from "src/utils/texts";

import SceneSelector from "components/presentation/SceneSelector";
import StageView from "components/presentation/StageView";
import AdminToolbar from "components/presentation/AdminToolbar";
import EditorPalette from "components/presentation/EditorPalette";

export default function PresentationPage() {
  const router = useRouter();
  const { id: presentationId } = router.query;

  // --- MUDANÇA: Usando o novo hook "cérebro" ---
  const {
    presentation,
    isLoading,
    error,
    user,
    currentScene,
    currentSceneId,
    setCurrentSceneId,
    isEditorMode,
    setIsEditorMode, // A função "interruptor"
    permissions, // O objeto de permissões
    palette,
  } = usePresentationEditor(presentationId);
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
      maxWidth="max-w-7xl" // <-- Aumentei para 7xl para caber a paleta
    >
      <div className="p-4">
        <AdminToolbar
          isEditorMode={isEditorMode}
          onToggleEditorMode={() => setIsEditorMode(!isEditorMode)}
          permissions={permissions}
        />

        {/* --- MUDANÇA: Layout de 2 Colunas (Grid) --- */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal (2/3) */}
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold mb-2">{presentation.name}</h1>
            <p className="text-gray-600 mb-6">{presentation.description}</p>

            <SceneSelector
              scenes={presentation.scenes}
              currentSceneId={currentSceneId}
              onSelectScene={setCurrentSceneId}
            />

            <StageView scene={currentScene} loggedInUser={user} />
          </div>

          {/* Coluna Lateral (1/3) - A Paleta */}
          {isEditorMode && (
            <aside className="lg:col-span-1">
              <div className="sticky top-4">
                {" "}
                {/* Faz a paleta "flutuar" */}
                <h3 className="text-xl font-bold mb-4">Paleta de Elementos</h3>
                <EditorPalette palette={palette} />
              </div>
            </aside>
          )}
        </div>
        {/* --- FIM DA MUDANÇA --- */}
      </div>
    </PageLayout>
  );
}
