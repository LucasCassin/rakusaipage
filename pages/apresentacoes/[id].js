import { useRouter } from "next/router";
import { useMemo } from "react";
import { usePresentationEditor } from "src/hooks/usePresentationEditor";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import PageLayout from "components/layouts/PageLayout";
import InitialLoading from "components/InitialLoading";
import ErrorPage from "components/ui/ErrorPage";
import Button from "components/ui/Button";
import { texts } from "src/utils/texts";

import SceneSelector from "components/presentation/SceneSelector";
import StageView from "components/presentation/StageView";
import AdminToolbar from "components/presentation/AdminToolbar";
import EditorPalette from "components/presentation/EditorPalette";
import SceneElementModal from "components/presentation/SceneElementModal";

import TransitionStepModal from "components/presentation/TransitionStepModal";
import CastManagerModal from "components/presentation/CastManagerModal";
import ConfirmGlobalEditModal from "components/presentation/ConfirmGlobalEditModal";
import ShareModal from "components/presentation/ShareModal";

export default function PresentationPage() {
  const router = useRouter();
  const { id: presentationId } = router.query;

  const {
    presentation,
    isLoading,
    error,
    user,
    currentScene,
    currentSceneId,
    setCurrentSceneId,
    isEditorMode,
    setIsEditorMode,
    permissions, // Contém as "chaves" (canCreateStep, etc.)
    palette,
    castHook,
    modal, // Contém .openElement, .openStep, .saveStep, etc.
    dropHandlers,
    stepHandlers, // Contém .deleteStep
  } = usePresentationEditor(presentationId);

  // ... (código de Loading e Erro permanece o mesmo) ...
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <InitialLoading message="Carregando apresentação..." />
      </div>
    );
  }

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
    <DndProvider backend={HTML5Backend}>
      <PageLayout
        title={presentation?.name || "Apresentação"}
        description={`Mapa de palco para ${presentation?.name || "apresentação"}.`}
        maxWidth="max-w-7xl"
      >
        <div className="p-4">
          <AdminToolbar
            isEditorMode={isEditorMode}
            onToggleEditorMode={() => setIsEditorMode(!isEditorMode)}
            permissions={permissions}
            onOpenCastModal={modal.openCast}
            onOpenShareModal={modal.openShare}
          />

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold mb-2">{presentation.name}</h1>
              <p className="text-gray-600 mb-6">{presentation.description}</p>

              <SceneSelector
                scenes={presentation.scenes}
                currentSceneId={currentSceneId}
                onSelectScene={setCurrentSceneId}
              />

              {/* --- MUDANÇA: Passando todas as props de edição --- */}
              <StageView
                scene={currentScene}
                loggedInUser={user}
                isEditorMode={isEditorMode}
                permissions={permissions}
                // Props do Mapa
                onPaletteDrop={dropHandlers.onPaletteDrop}
                onElementMove={dropHandlers.onElementMove}
                onElementClick={modal.openElement}
                // Props da Checklist
                onAddStep={() => modal.openStep("create")}
                onEditStep={(step) => modal.openStep("edit", step)}
                onDeleteStep={stepHandlers.deleteStep}
              />
              {/* --- FIM DA MUDANÇA --- */}
            </div>

            {isEditorMode && (
              <aside className="lg:col-span-1">
                <div className="sticky top-4">
                  <h3 className="text-xl font-bold mb-4">
                    Paleta de Elementos
                  </h3>
                  <EditorPalette palette={palette} />
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* --- MUDANÇA: Renderizar AMBOS os Modais --- */}
        {modal.isElementOpen && (
          <SceneElementModal
            modalData={modal.elementData}
            cast={{ viewers: castHook.viewers, isLoading: castHook.isLoading }}
            error={modal.elementError}
            onClose={modal.closeElement}
            onSubmit={modal.saveElement}
          />
        )}

        {/* Modal de Passo (Checklist) */}
        {modal.isStepOpen && (
          <TransitionStepModal
            modalData={modal.stepData}
            cast={{ viewers: castHook.viewers, isLoading: castHook.isLoading }}
            error={modal.stepError}
            onClose={modal.closeStep}
            onSubmit={modal.saveStep}
          />
        )}

        {/* Modal de Elenco (Cast) */}
        {modal.isCastOpen && (
          <CastManagerModal
            presentation={presentation}
            permissions={permissions}
            onClose={modal.closeCast}
            castHook={castHook}
          />
        )}

        {/* O Novo Modal de Confirmação Global */}
        {modal.isGlobalEditOpen && (
          <ConfirmGlobalEditModal
            modalData={modal.globalEditData}
            error={modal.globalEditError}
            onClose={modal.closeGlobalEdit}
            onUpdateLocal={modal.updateLocally}
            onUpdateGlobal={modal.updateGlobally}
          />
        )}

        {modal.isShareOpen && (
          <ShareModal
            presentation={presentation}
            error={modal.shareError}
            onClose={modal.closeShare}
            onSubmit={modal.savePublicStatus}
          />
        )}
        {/* --- FIM DA MUDANÇA --- */}
      </PageLayout>
    </DndProvider>
  );
}
