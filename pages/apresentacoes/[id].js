import React, { useState } from "react";
import { useRouter } from "next/router";
import { usePresentationEditor } from "src/hooks/usePresentationEditor";
import PageLayout from "components/layouts/PageLayout";
import ErrorPage from "components/ui/ErrorPage";
import { texts } from "src/utils/texts";
import InitialLoading from "components/InitialLoading";
import Link from "next/link";
// Imports dos Componentes da Página
import AdminToolbar from "components/presentation/AdminToolbar";
import SceneSelector from "components/presentation/SceneSelector";
import SceneListEditor from "components/presentation/SceneListEditor";
import StageView from "components/presentation/StageView";
import EditorPalette from "components/presentation/EditorPalette";
import PrintablePresentation from "components/presentation/PrintablePresentation";
// Imports dos Modais
import SceneElementModal from "components/presentation/SceneElementModal";
import ConfirmGlobalEditModal from "components/presentation/ConfirmGlobalEditModal";
import CastManagerModal from "components/presentation/CastManagerModal";
import ShareModal from "components/presentation/ShareModal";
import SceneFormModal from "components/presentation/SceneFormModal";
import DeleteSceneModal from "components/presentation/DeleteSceneModal";
import TransitionStepModal from "components/presentation/TransitionStepModal";
import PasteSceneModal from "components/presentation/PasteSceneModal";
import Alert from "components/ui/Alert";
import StatsModal from "components/presentation/StatsModal";

// 2. IMPORTAR ÍCONES PARA O BOTÃO MOBILE
import {
  FiChevronsUp,
  FiChevronsDown,
  FiCalendar,
  FiMapPin,
  FiClock,
  FiNavigation,
  FiArrowLeft,
  FiBarChart2,
} from "react-icons/fi";

/**
 * A PÁGINA PRINCIPAL DO EDITOR DE MAPA DE PALCO
 * (Refatorada para Layout Mobile-First)
 */
export default function PresentationPage() {
  const router = useRouter();
  const { id: presentationId } = router.query;

  const editor = usePresentationEditor(presentationId);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const togglePalette = () => setIsPaletteOpen((prev) => !prev);

  if (editor.isLoading || !router.isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <InitialLoading message="Carregando apresentação..." />
      </div>
    );
  }

  if (editor.error) {
    return (
      <ErrorPage
        title="Acesso Negado"
        message={
          editor.error || "Você não tem permissão para ver esta apresentação."
        }
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

  if (!editor.presentation) {
    return (
      <ErrorPage
        title="Apresentação Não Encontrada"
        message="A apresentação que você está procurando não existe ou o ID é inválido."
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

  const { presentation, currentScene, currentSceneId, permissions } = editor;

  const mainColumnClasses = editor.isEditorMode
    ? "lg:col-span-2"
    : "lg:col-span-3";

  const formattedDate = presentation.date
    ? new Date(presentation.date).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo", // Usar fuso local para hora de encontro
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const formattedMeetTime = presentation.meet_time
    ? new Date(presentation.meet_time).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo", // Usar fuso local para hora de encontro
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <>
      <PageLayout
        title={presentation?.name || "Apresentação"}
        description={`Mapa de palco para ${presentation?.name || "apresentação"}.`}
        maxWidth="max-w-7xl"
      >
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {editor.globalSuccessMessage && (
            <Alert type="success" className="mb-4">
              {editor.globalSuccessMessage}
            </Alert>
          )}

          <div className="mb-4">
            <Link
              href="/apresentacoes"
              className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <FiArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Apresentações
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {presentation.name}
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            {presentation.description ||
              "Use o editor abaixo para construir o mapa de palco."}
          </p>

          {(formattedDate ||
            presentation.location ||
            formattedMeetTime ||
            presentation.meet_location) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              {/* Data do Evento */}
              {formattedDate && (
                <div className="flex items-start gap-2 text-sm">
                  <FiCalendar className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-700 block">
                      Data do Evento
                    </span>
                    <span className="text-gray-600">{formattedDate}</span>
                  </div>
                </div>
              )}
              {/* Local do Evento */}
              {presentation.location && (
                <div className="flex items-start gap-2 text-sm">
                  <FiMapPin className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-700 block">
                      Local do Evento
                    </span>
                    <span className="text-gray-600">
                      {presentation.location}
                    </span>
                  </div>
                </div>
              )}
              {/* Horário de Encontro */}
              {formattedMeetTime && (
                <div className="flex items-start gap-2 text-sm">
                  <FiClock className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-700 block">
                      Encontro (Data e Hora)
                    </span>
                    <span className="text-gray-600">{formattedMeetTime}</span>
                  </div>
                </div>
              )}
              {/* Local de Encontro */}
              {presentation.meet_location && (
                <div className="flex items-start gap-2 text-sm">
                  <FiNavigation className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-700 block">
                      Local de Encontro
                    </span>
                    <span className="text-gray-600">
                      {presentation.meet_location}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            <div className={mainColumnClasses}>
              <AdminToolbar
                isEditorMode={editor.isEditorMode}
                onToggleEditorMode={() =>
                  editor.setIsEditorMode(!editor.isEditorMode)
                }
                permissions={permissions}
                onOpenCastModal={editor.modal.openCast}
                onOpenShareModal={editor.modal.openShare}
                onPrint={() => {
                  if (editor.printHandlers.ref.current) {
                    editor.printHandlers.onPrint();
                  }
                }}
              />

              {editor.isEditorMode ? (
                <SceneListEditor
                  scenes={presentation.scenes}
                  currentSceneId={currentSceneId}
                  permissions={permissions}
                  onSelectScene={editor.setCurrentSceneId}
                  onAddScene={() => editor.modal.openSceneForm("create")}
                  onEditScene={(scene) =>
                    editor.modal.openSceneForm("edit", scene)
                  }
                  onDeleteScene={editor.modal.openDeleteScene}
                  reorderHandlers={editor.reorderHandlers}
                  onCopyScene={editor.modal.handleCopy}
                  onPasteScene={editor.modal.openPaste}
                  hasClipboardContent={!!editor.clipboardContent}
                />
              ) : (
                <SceneSelector
                  scenes={presentation.scenes}
                  currentSceneId={currentSceneId}
                  onSelectScene={editor.setCurrentSceneId}
                />
              )}

              <StageView
                scene={currentScene}
                loggedInUser={editor.user}
                isEditorMode={editor.isEditorMode}
                permissions={permissions}
                onPaletteDrop={editor.dropHandlers.onPaletteDrop}
                onElementMove={editor.dropHandlers.onElementMove}
                onElementClick={editor.modal.openElement}
                onElementDelete={editor.modal.deleteElement}
                onElementMerge={editor.dropHandlers.onElementMerge}
                onAddStep={() => editor.modal.openStep("create")}
                onEditStep={(step) => editor.modal.openStep("edit", step)}
                onDeleteStep={editor.stepHandlers.deleteStep}
              />
            </div>

            {editor.isEditorMode && (
              <EditorPalette
                palette={editor.palette}
                isPaletteOpen={isPaletteOpen}
                onTogglePalette={togglePalette}
              />
            )}
          </div>

          <button
            onClick={editor.modal.openStats}
            className="fixed bottom-6 right-6 z-30 p-3 bg-white text-rakusai-purple rounded-full shadow-lg hover:bg-gray-50 hover:scale-110 transition-all border border-gray-200 flex items-center justify-center group"
            title="Ver Estatísticas"
          >
            <FiBarChart2 size={24} />
            {/* Tooltip Mobile/Desktop */}
            <span className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Estatísticas
            </span>
          </button>
        </div>
      </PageLayout>
      {editor.isEditorMode && (
        <button
          type="button"
          onClick={togglePalette}
          className="lg:hidden fixed bottom-4 right-4 z-50 flex items-center justify-center w-16 h-16 bg-rakusai-purple rounded-full shadow-lg text-white"
          aria-label={isPaletteOpen ? "Fechar Paleta" : "Abrir Paleta"}
        >
          {isPaletteOpen ? (
            <FiChevronsDown className="w-8 h-8" />
          ) : (
            <FiChevronsUp className="w-8 h-8" />
          )}
        </button>
      )}

      {editor.modal.isElementOpen && (
        <SceneElementModal
          modalData={editor.modal.elementData}
          cast={editor.castHook}
          error={editor.modal.elementError}
          onClose={editor.modal.closeElement}
          onSubmit={editor.modal.saveElement}
          onDelete={editor.modal.deleteElement}
        />
      )}
      {editor.modal.isGlobalEditOpen && (
        <ConfirmGlobalEditModal
          modalData={editor.modal.globalEditData}
          error={editor.modal.globalEditError}
          onClose={editor.modal.closeGlobalEdit}
          onUpdateLocal={editor.modal.updateLocally}
          onUpdateGlobal={editor.modal.updateGlobally}
        />
      )}
      {editor.modal.isCastOpen && (
        <CastManagerModal
          presentation={presentation}
          permissions={permissions}
          onClose={editor.modal.closeCast}
          castHook={editor.castHook}
        />
      )}
      {editor.modal.isShareOpen && (
        <ShareModal
          presentation={presentation}
          error={editor.modal.shareError}
          onClose={editor.modal.closeShare}
          onSubmit={editor.modal.savePublicStatus}
        />
      )}
      {editor.modal.isSceneFormOpen && (
        <SceneFormModal
          modalData={editor.modal.sceneFormModalData}
          error={editor.modal.sceneFormModalError}
          onClose={editor.modal.closeSceneForm}
          onSubmit={editor.modal.saveScene}
        />
      )}
      {editor.modal.isDeleteSceneOpen && (
        <DeleteSceneModal
          scene={editor.modal.deleteSceneModalData?.scene}
          error={editor.modal.deleteSceneModalError}
          onClose={editor.modal.closeDeleteScene}
          onDelete={editor.modal.deleteScene}
        />
      )}
      {editor.modal.isStepOpen && (
        <TransitionStepModal
          modalData={editor.modal.stepData}
          cast={editor.castHook}
          error={editor.modal.stepError}
          onClose={editor.modal.closeStep}
          onSubmit={editor.modal.saveStep}
        />
      )}

      {editor.modal.isPasteOpen && (
        <PasteSceneModal
          sceneName={editor.clipboardContent?.name}
          error={editor.modal.pasteError}
          onClose={editor.modal.closePaste}
          onSubmit={editor.modal.handlePaste}
        />
      )}

      {editor.modal.isStatsOpen && (
        <StatsModal
          presentation={editor.presentation}
          loggedInUser={editor.user}
          onClose={editor.modal.closeStats}
          isLoading={editor.isLoading}
        />
      )}

      <PrintablePresentation
        ref={editor.printHandlers.ref}
        presentation={presentation}
      />
    </>
  );
}
