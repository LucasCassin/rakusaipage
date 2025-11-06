import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { usePresentation } from "./usePresentation";
import { useAuth } from "src/contexts/AuthContext";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings.js";
import { usePresentationCast } from "./usePresentationCast";

export function usePresentationEditor(presentationId) {
  const router = useRouter();

  const {
    presentation,
    isLoading: isLoadingData,
    error,
    user,
    fetchData: refetchPresentationData,
  } = usePresentation(presentationId);

  // ... (Estados do Editor, Cena, Paleta e Elenco permanecem os mesmos) ...
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState(null);
  const [pool, setPool] = useState([]);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [elementTypes, setElementTypes] = useState([]);
  const [isLoadingElementTypes, setIsLoadingElementTypes] = useState(false);
  const [hasFetchedPaletteData, setHasFetchedPaletteData] = useState(false);

  // --- Estados do Modal de Elemento (Mapa) ---
  const [isElementModalOpen, setIsElementModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalError, setModalError] = useState(null);

  // --- MUDANÇA: Estados do Modal de Passo (Checklist) ---
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [stepModalData, setStepModalData] = useState(null); // { mode, step? }
  const [stepModalError, setStepModalError] = useState(null);

  const [isCastModalOpen, setIsCastModalOpen] = useState(false);
  // --- FIM DA MUDANÇA ---

  // ... (Lógica de Cena e Permissões permanecem as mesmas) ...
  useEffect(() => {
    if (
      presentation?.scenes &&
      presentation.scenes.length > 0 &&
      !currentSceneId
    ) {
      setCurrentSceneId(presentation.scenes[0].id);
    }
  }, [presentation, currentSceneId]);

  const currentScene = useMemo(() => {
    if (!presentation || !currentSceneId) return null;
    return presentation.scenes.find((s) => s.id === currentSceneId);
  }, [presentation, currentSceneId]);

  const permissions = useMemo(
    () => ({
      canEdit: user?.features.includes("update:presentation") || false,
      canCreateScenes: user?.features.includes("create:scene") || false,
      canDeleteScenes: user?.features.includes("delete:scene") || false,
      canManageCast: user?.features.includes("create:viewer") || false,
      canReadCast: user?.features.includes("read:viewer") || false,
      // (Adicionaremos chaves de "step" aqui se precisarmos desabilitar botões)
      canCreateStep: user?.features.includes("create:step") || false,
      canUpdateStep: user?.features.includes("update:step") || false,
      canDeleteStep: user?.features.includes("delete:step") || false,
    }),
    [user],
  );

  // 5. Funções de API (que usam handleApiResponse)

  const fetchPool = useCallback(async () => {
    if (!presentationId || !permissions.canEdit) return;
    setIsLoadingPool(true);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/pool`,
      );
      await handleApiResponse({
        response,
        router,
        onError: (err) => console.error("Erro no Pool:", err), // TODO: setError dedicado
        onSuccess: (data) => {
          setPool(data);
        },
      });
    } catch (e) {
      console.error("Erro de conexão ao buscar pool:", e);
    } finally {
      setIsLoadingPool(false);
    }
  }, [presentationId, permissions.canEdit, router]);

  // --- MUDANÇA: Nova função para buscar o "Catálogo" ---
  const fetchElementTypes = useCallback(async () => {
    if (!permissions.canEdit) return; // Só busca se puder editar
    setIsLoadingElementTypes(true);
    try {
      const response = await fetch(
        // Vamos assumir que você tem um endpoint para listar os tipos
        // (Baseado no seu 'element_type.js')
        `${settings.global.API.ENDPOINTS.ELEMENT_TYPES || "/api/v1/element-types"}`,
      );
      await handleApiResponse({
        response,
        router,
        onError: (err) => console.error("Erro nos Tipos:", err), // TODO: setError dedicado
        onSuccess: (data) => {
          setElementTypes(data);
        },
      });
    } catch (e) {
      console.error("Erro de conexão ao buscar tipos de elementos:", e);
    } finally {
      setIsLoadingElementTypes(false);
    }
  }, [permissions.canEdit, router]);

  const castHook = usePresentationCast(presentationId, permissions);

  // Efeito para buscar os dados da paleta UMA VEZ
  useEffect(() => {
    if (isEditorMode && !hasFetchedPaletteData && permissions.canEdit) {
      fetchPool();
      fetchElementTypes();
      setHasFetchedPaletteData(true);
    }
  }, [
    isEditorMode,
    hasFetchedPaletteData,
    permissions.canEdit,
    fetchPool,
    fetchElementTypes,
  ]);

  // --- Funções do Modal ---
  const closeElementModal = () => {
    setIsElementModalOpen(false);
    setModalData(null);
    setModalError(null);
  };

  const handlePaletteDrop = (item, position) => {
    setModalData({
      mode: "create",
      position: position,
      ...item,
    });
    setIsElementModalOpen(true);
  };

  // --- MUDANÇA: Implementar a função "open" para edição ---
  const openElementEditor = (element) => {
    // 'element' vem do 'StageElement' clicado
    setModalData({
      mode: "edit", // Define o modo para 'edit'
      id: element.id, // O ID é crucial para o PATCH
      display_name: element.display_name,
      assigned_user_id: element.assigned_user_id,
      element_type_id: element.element_type_id,
      element_type_name: element.element_type_name, // O modal usa isso no título
      // Posição não é editável no modal, apenas no 'drag'
    });
    setIsElementModalOpen(true);
  };
  // --- FIM DA MUDANÇA ---

  const saveElement = useCallback(
    async (formData) => {
      setModalError(null);

      const isCreateMode = modalData?.mode === "create";

      const body = {
        scene_id: currentSceneId,
        element_type_id: formData.element_type_id,
        display_name: formData.display_name || null,
        assigned_user_id: formData.assigned_user_id || null,
        position_x: (formData.position?.x || 50).toFixed(2),
        position_y: (formData.position?.y || 50).toFixed(2),
      };

      // A lógica de 'saveElement' JÁ SUPORTA "edit"
      const url = isCreateMode
        ? `${settings.global.API.ENDPOINTS.SCENES}/${currentSceneId}/elements`
        : `${settings.global.API.ENDPOINTS.SCENE_ELEMENTS}/${modalData.id}`;

      const method = isCreateMode ? "POST" : "PATCH";

      const editBody = {
        display_name: formData.display_name || null,
        assigned_user_id: formData.assigned_user_id || null,
      };

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isCreateMode ? body : editBody),
        });

        await handleApiResponse({
          response,
          router,
          setError: setModalError,
          onSuccess: () => {
            refetchPresentationData();
            if (isCreateMode && !formData.isTemplate && formData.display_name) {
              fetchPool();
            }
            closeElementModal();
          },
        });
      } catch (e) {
        setModalError("Erro de conexão. Verifique sua internet.");
        console.error("Erro ao salvar elemento:", e);
      }
    },
    [router, refetchPresentationData, fetchPool, currentSceneId, modalData],
  );

  const moveElement = useCallback(
    async (elementId, position) => {
      // 'elementId' é o ID do elemento que JÁ ESTÁ no palco
      // 'position' é o { x, y } calculado pelo 'useDrop'

      if (!elementId || !position) return;

      const body = {
        position_x: position.x.toFixed(2),
        position_y: position.y.toFixed(2),
      };

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.SCENE_ELEMENTS}/${elementId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );

        // Usamos seu helper
        await handleApiResponse({
          response,
          router,
          // TODO: Usar um setError de modal ou toast
          onError: (err) =>
            console.error("Erro ao mover elemento:", err.message),
          onSuccess: () => {
            // Sucesso! Recarrega a apresentação inteira para
            // garantir que a nova posição está salva.
            refetchPresentationData();
          },
        });
      } catch (e) {
        console.error("Erro de conexão ao mover elemento:", e);
      }
    },
    [router, refetchPresentationData],
  );
  const openStepModal = (mode, step = null) => {
    setStepModalData({ mode, step });
    setIsStepModalOpen(true);
    setStepModalError(null);
  };

  const closeStepModal = () => {
    setIsStepModalOpen(false);
    setStepModalData(null);
    setStepModalError(null);
  };

  const saveStep = useCallback(
    async (formData) => {
      setStepModalError(null);

      const { mode, step } = stepModalData;
      const isCreateMode = mode === "create";

      const body = {
        scene_id: currentSceneId, // Pega a cena ativa
        description: formData.description,
        assigned_user_id: formData.assigned_user_id || null,
        // O 'order' é complexo. Para 'create', vamos apenas adicionar no final.
        // Para 'create', pegamos o 'order' mais alto e somamos 1
        order: isCreateMode
          ? currentScene?.transition_steps.length || 0
          : step.order, // Para 'edit', mantemos a ordem (por enquanto)
      };

      // No modo 'edit', só podemos mudar 'description' e 'assigned_user_id'
      const editBody = {
        description: formData.description,
        assigned_user_id: formData.assigned_user_id || null,
        order: formData.order, // (Se quisermos reordenar no futuro)
      };

      const url = isCreateMode
        ? `${settings.global.API.ENDPOINTS.SCENES}/${currentSceneId}/steps`
        : `${settings.global.API.ENDPOINTS.TRANSITION_STEPS}/${step.id}`;

      const method = isCreateMode ? "POST" : "PATCH";

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(isCreateMode ? body : editBody),
        });

        await handleApiResponse({
          response,
          router,
          setError: setStepModalError, // Erro no modal de passo
          onSuccess: () => {
            refetchPresentationData(); // Recarrega tudo
            closeStepModal(); // Fecha o modal
          },
        });
      } catch (e) {
        setStepModalError("Erro de conexão. Verifique sua internet.");
        console.error("Erro ao salvar passo:", e);
      }
    },
    [
      router,
      refetchPresentationData,
      currentSceneId,
      currentScene,
      stepModalData,
    ],
  );

  const deleteStep = useCallback(
    async (stepId) => {
      // (Não precisamos de um modal de erro aqui,
      // pois o modal de confirmação já estará fechado)
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.TRANSITION_STEPS}/${stepId}`,
          { method: "DELETE" },
        );

        await handleApiResponse({
          response,
          router,
          setError: (msg) => alert(msg), // Fallback
          onSuccess: () => {
            refetchPresentationData(); // Recarrega tudo
          },
        });
      } catch (e) {
        console.error("Erro de conexão ao deletar passo:", e);
      }
    },
    [router, refetchPresentationData],
  );

  const openCastModal = () => {
    setIsCastModalOpen(true);
  };

  const closeCastModal = () => {
    setIsCastModalOpen(false);
  };
  // --- FIM DA MUDANÇA ---

  return {
    // ... (props de leitura) ...
    presentation,
    isLoading: isLoadingData,
    error,
    user,
    currentScene,
    currentSceneId,
    setCurrentSceneId,
    refetchPresentationData,
    isEditorMode,
    setIsEditorMode,
    permissions,
    palette: {
      pool,
      elementTypes,
      isLoading: isLoadingPool || isLoadingElementTypes,
    },
    castHook: castHook,
    // --- MUDANÇA: 'modal.open' agora está conectada ---
    modal: {
      // Modal de Elemento (Mapa)
      isElementOpen: isElementModalOpen,
      elementData: modalData,
      elementError: modalError,
      openElement: openElementEditor,
      closeElement: closeElementModal,
      saveElement: saveElement,

      // Modal de Passo (Checklist)
      isStepOpen: isStepModalOpen,
      stepData: stepModalData,
      stepError: stepModalError,
      openStep: openStepModal,
      closeStep: closeStepModal,
      saveStep: saveStep,

      isCastOpen: isCastModalOpen,
      openCast: openCastModal,
      closeCast: closeCastModal,
    },
    // --- FIM DA MUDANÇA ---

    dropHandlers: {
      onPaletteDrop: handlePaletteDrop,
      onElementMove: moveElement,
    },
    stepHandlers: {
      deleteStep: deleteStep,
    },
    // --- FIM DA MUDANÇA ---
  };
}
