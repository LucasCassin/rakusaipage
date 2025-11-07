import { useRouter } from "next/router";
import { useMemo } from "react";
import { usePresentationEditor } from "src/hooks/usePresentationEditor";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import PageLayout from "components/layouts/PageLayout";
import InitialLoading from "components/InitialLoading";
import ErrorPage from "components/ui/ErrorPage";
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
import PrintablePresentation from "components/presentation/PrintablePresentation";
import SceneListEditor from "components/presentation/SceneListEditor";
import SceneFormModal from "components/presentation/SceneFormModal";
import DeleteSceneModal from "components/presentation/DeleteSceneModal";

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
    printHandlers,
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
    // O DndProvider DEVE envolver TUDO
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
            onPrint={printHandlers.onPrint}
          />

          <div
            className={`mt-6 grid grid-cols-1 ${
              isEditorMode ? "lg:grid-cols-3" : "lg:grid-cols-1"
            } gap-6`}
          >
            {/* O 'div' abaixo agora será 'lg:col-span-3' (full-width)
              quando o editor estiver desligado, centralizando o conteúdo.
            */}
            <div className={isEditorMode ? "lg:col-span-2" : "lg:col-span-3"}>
              <h1 className="text-3xl font-bold mb-2">
                {presentation?.name || "Apresentação"}
              </h1>
              <p className="text-gray-600 mb-6">
                {presentation?.description || null}
              </p>

              {isEditorMode ? (
                <SceneListEditor
                  scenes={presentation.scenes}
                  currentSceneId={currentSceneId}
                  permissions={permissions}
                  onSelectScene={setCurrentSceneId}
                  onAddScene={() => modal.openSceneForm("create")}
                  onEditScene={(scene) => modal.openSceneForm("edit", scene)}
                  onDeleteScene={modal.openDeleteScene}
                />
              ) : (
                <SceneSelector
                  scenes={presentation.scenes}
                  currentSceneId={currentSceneId}
                  onSelectScene={setCurrentSceneId}
                />
              )}

              <StageView
                scene={currentScene}
                loggedInUser={user}
                isEditorMode={isEditorMode}
                permissions={permissions}
                onPaletteDrop={dropHandlers.onPaletteDrop}
                onElementMove={dropHandlers.onElementMove}
                onElementClick={modal.openElement}
                onAddStep={() => modal.openStep("create")}
                onEditStep={(step) => modal.openStep("edit", step)}
                onDeleteStep={stepHandlers.deleteStep}
              />
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

        {/* O componente "fantasma" de impressão PODE ficar aqui dentro,
          pois ele não é um overlay.
        */}
        <PrintablePresentation
          ref={printHandlers.ref}
          presentation={presentation}
        />
      </PageLayout>

      {/* --- MUDANÇA: MODAIS MOVIDOS PARA FORA DO PageLayout --- */}
      {/* Isso corrige o bug do backdrop (Bug 1) e
        também ajuda a previnir loops de renderização (como o de antes)
      */}
      {modal.isElementOpen && (
        <SceneElementModal
          modalData={modal.elementData}
          cast={{ viewers: castHook.viewers, isLoading: castHook.isLoading }}
          error={modal.elementError}
          onClose={modal.closeElement}
          onSubmit={modal.saveElement}
          onDelete={modal.deleteElement} // <-- ADICIONADO
        />
      )}

      {modal.isStepOpen && (
        <TransitionStepModal
          modalData={modal.stepData}
          cast={{ viewers: castHook.viewers, isLoading: castHook.isLoading }}
          error={modal.stepError}
          onClose={modal.closeStep}
          onSubmit={modal.saveStep}
        />
      )}

      {modal.isCastOpen && (
        <CastManagerModal
          presentation={presentation}
          permissions={permissions}
          onClose={modal.closeCast}
          castHook={castHook}
        />
      )}

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

      {modal.isSceneFormOpen && (
        <SceneFormModal
          modalData={modal.sceneFormModalData}
          error={modal.sceneFormModalError}
          onClose={modal.closeSceneForm}
          onSubmit={modal.saveScene}
        />
      )}

      {modal.isDeleteSceneOpen && (
        <DeleteSceneModal
          scene={modal.deleteSceneModalData?.scene}
          error={modal.deleteSceneModalError}
          onClose={modal.closeDeleteScene}
          onDelete={modal.deleteScene}
        />
      )}
      {/* --- FIM DA MUDANÇA --- */}
    </DndProvider>
  );
}
