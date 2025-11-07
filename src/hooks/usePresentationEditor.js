import { useState, useEffect, useMemo, useCallback, useRef } from "react"; // <-- ADICIONE "useRef"
import { useReactToPrint } from "react-to-print";
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
    setPresentation,
    isLoading,
    error,
    user,
    fetchData: refetchPresentationData,
  } = usePresentation(presentationId);

  // ... (Estados do Editor, Cena, Paleta) ...
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState(null);
  const [pool, setPool] = useState([]);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [elementTypes, setElementTypes] = useState([]);
  const [isLoadingElementTypes, setIsLoadingElementTypes] = useState(false);
  const [hasFetchedPaletteData, setHasFetchedPaletteData] = useState(false);

  // --- Estados dos Modais ---
  const [isElementModalOpen, setIsElementModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalError, setModalError] = useState(null);

  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [stepModalData, setStepModalData] = useState(null);
  const [stepModalError, setStepModalError] = useState(null);

  const [isCastModalOpen, setIsCastModalOpen] = useState(false);

  // --- MUDANÇA: Estado para o Modal de Edição Global ---
  const [isGlobalEditModalOpen, setIsGlobalEditModalOpen] = useState(false);
  const [globalEditData, setGlobalEditData] = useState(null); // { original, updated, element }
  const [globalEditError, setGlobalEditError] = useState(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalError, setShareModalError] = useState(null);

  const [isSceneFormModalOpen, setIsSceneFormModalOpen] = useState(false);
  const [sceneFormModalData, setSceneFormModalData] = useState(null); // { mode, scene? }
  const [sceneFormModalError, setSceneFormModalError] = useState(null);

  const [isDeleteSceneModalOpen, setIsDeleteSceneModalOpen] = useState(false);
  const [deleteSceneModalData, setDeleteSceneModalData] = useState(null); // { scene }
  const [deleteSceneModalError, setDeleteSceneModalError] = useState(null);

  const componentToPrintRef = useRef(null);
  // --- FIM DA MUDANÇA ---

  const handlePrint = useReactToPrint({
    content: () => componentToPrintRef.current,
    documentTitle: presentation?.name || "Apresentação Rakusai",
    // (Podemos adicionar CSS de impressão aqui depois, se necessário)
  });

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

  const castHook = usePresentationCast(presentationId, permissions, router);
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

      const {
        mode,
        id,
        display_name: oldName,
        assigned_user_id: oldUserId,
      } = modalData;
      const { display_name: newName, assigned_user_id: newUserId } = formData;

      const isCreateMode = mode === "create";

      // 1. Se for MODO CRIAÇÃO (veio da paleta)
      if (isCreateMode) {
        // (A API de criação precisa de *todos* os dados)
        const createBody = {
          scene_id: currentSceneId,
          element_type_id: formData.element_type_id,
          display_name: newName || null,
          assigned_user_id: newUserId || null,
          position_x: (formData.position?.x || 50).toFixed(2),
          position_y: (formData.position?.y || 50).toFixed(2),
        };
        // Chama a API de criação direto (sem modal extra)
        await createElementApi(createBody, formData.isTemplate);

        // 2. Se for MODO EDIÇÃO (clicou no ícone)
      } else {
        // Verifica se o nome ou o usuário mudou
        const nameChanged = newName !== (oldName || "");
        const userChanged = newUserId !== (oldUserId || "");

        if (!nameChanged && !userChanged) {
          // Se nada mudou, apenas fecha o modal
          closeElementModal();
          return;
        }

        // Se MUDOU, fecha o modal de edição e abre o modal de "confirmação"
        closeElementModal();
        setGlobalEditData({
          elementId: id,
          element_type_id: formData.element_type_id,
          oldData: {
            display_name: oldName || null,
            assigned_user_id: oldUserId || null,
          },
          newData: {
            display_name: newName || null,
            assigned_user_id: newUserId || null,
          },
        });
        setIsGlobalEditModalOpen(true);
      }
    },
    [modalData, currentSceneId], // (Removido 'saveElementApi' das dependências)
  );

  const createElementApi = useCallback(
    async (body, isTemplate) => {
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.SCENES}/${currentSceneId}/elements`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        await handleApiResponse({
          response,
          router,
          setError: setModalError, // Mostra erro no modal (se ainda estiver aberto)
          onSuccess: () => {
            refetchPresentationData();
            if (!isTemplate && body.display_name) fetchPool();
            closeElementModal();
          },
        });
      } catch (e) {
        setModalError("Erro de conexão.");
        console.error("Erro ao criar elemento:", e);
      }
    },
    [router, refetchPresentationData, fetchPool, currentSceneId],
  );

  // (API de Edição Local - chamada pelo *novo* modal)
  const updateElementLocally = useCallback(async () => {
    setGlobalEditError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.SCENE_ELEMENTS}/${globalEditData.elementId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(globalEditData.newData),
        },
      );
      await handleApiResponse({
        response,
        router,
        setError: setGlobalEditError,
        onSuccess: () => {
          refetchPresentationData();
          closeGlobalEditModal();
        },
      });
    } catch (e) {
      setGlobalEditError("Erro de conexão.");
      console.error("Erro ao atualizar localmente:", e);
    }
  }, [router, refetchPresentationData, globalEditData]);

  // (API de Edição Global - chamada pelo *novo* modal)
  const updateElementGlobally = useCallback(async () => {
    setGlobalEditError(null);
    const { element_type_id } = globalEditData.oldData;
    const body = {
      element_type_id: globalEditData.element_type_id,
      old_display_name: globalEditData.oldData.display_name,
      new_display_name: globalEditData.newData.display_name,
      new_assigned_user_id: globalEditData.newData.assigned_user_id,
    };

    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/element-names`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      await handleApiResponse({
        response,
        router,
        setError: setGlobalEditError,
        onSuccess: () => {
          refetchPresentationData();
          fetchPool(); // Precisa atualizar o pool
          closeGlobalEditModal();
        },
      });
    } catch (e) {
      setGlobalEditError("Erro de conexão.");
      console.error("Erro ao atualizar globalmente:", e);
    }
  }, [
    router,
    refetchPresentationData,
    globalEditData,
    presentationId,
    fetchPool,
  ]);

  const closeGlobalEditModal = () => {
    setIsGlobalEditModalOpen(false);
    setGlobalEditData(null);
    setGlobalEditError(null);
  };

  const moveElement = useCallback(
    async (elementId, position) => {
      if (!elementId || !position) return;

      // --- MUDANÇA (BUG 3): ATUALIZAÇÃO OTIMISTA ---
      // 1. Atualiza o estado local IMEDIATAMENTE.
      setPresentation((prevPresentation) => {
        // (É seguro mutar a cópia 'newPresentation' pois o 'setPresentation'
        // aciona uma re-renderização com o novo objeto)
        const newPresentation = JSON.parse(JSON.stringify(prevPresentation));
        const scene = newPresentation.scenes.find(
          (s) => s.id === currentSceneId,
        );
        if (!scene) return prevPresentation; // Retorna o estado antigo se falhar
        const element = scene.scene_elements.find((el) => el.id === elementId);
        if (!element) return prevPresentation;

        element.position_x = position.x.toFixed(2);
        element.position_y = position.y.toFixed(2);

        return newPresentation;
      });
      // --- FIM DA MUDANÇA (PARTE 1) ---

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
        await handleApiResponse({
          response,
          router,
          onError: (err) => {
            console.error("Erro ao mover elemento, revertendo:", err.message);
            refetchPresentationData(); // Reverte para o estado do servidor
          },
        });
        // --- FIM DA MUDANÇA (PARTE 2) ---
      } catch (e) {
        console.error("Erro de conexão ao mover elemento:", e);
        refetchPresentationData(); // Reverte em caso de falha de conexão
      }
    },
    [router, refetchPresentationData, currentSceneId, setPresentation], // <-- Adicionar 'currentSceneId' e 'setPresentation'
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

  const deleteElement = useCallback(
    async (elementId) => {
      setModalError(null); // Limpa erros do modal
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.SCENE_ELEMENTS}/${elementId}`,
          { method: "DELETE" },
        );

        await handleApiResponse({
          response,
          router,
          setError: setModalError, // Mostra o erro no modal
          onSuccess: () => {
            refetchPresentationData(); // Recarrega tudo
            closeElementModal(); // Fecha o modal
          },
        });
      } catch (e) {
        setModalError("Erro de conexão ao deletar o elemento.");
        console.error("Erro de conexão ao deletar elemento:", e);
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

  const openShareModal = () => {
    setIsShareModalOpen(true);
    setShareModalError(null);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setShareModalError(null);
  };

  // A função de API que o modal de "Salvar" chamará
  const setPresentationPublicStatus = useCallback(
    async (isPublic) => {
      setShareModalError(null);
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_public: isPublic }),
          },
        );

        await handleApiResponse({
          response,
          router,
          setError: setShareModalError, // Mostra erro DENTRO do modal
          onSuccess: () => {
            refetchPresentationData(); // Recarrega os dados da apresentação
            closeShareModal(); // Fecha o modal
          },
        });
      } catch (e) {
        setShareModalError("Erro de conexão. Verifique sua internet.");
        console.error("Erro ao atualizar status público:", e);
      }
    },
    [router, refetchPresentationData, presentationId],
  );

  const openSceneFormModal = (mode, scene = null) => {
    setSceneFormModalData({ mode, scene });
    setIsSceneFormModalOpen(true);
    setSceneFormModalError(null);
  };

  const closeSceneFormModal = () => {
    setIsSceneFormModalOpen(false);
    setSceneFormModalData(null);
    setSceneFormModalError(null);
  };

  const openDeleteSceneModal = (scene) => {
    setDeleteSceneModalData({ scene });
    setIsDeleteSceneModalOpen(true);
    setDeleteSceneModalError(null);
  };

  const closeDeleteSceneModal = () => {
    setIsDeleteSceneModalOpen(false);
    setDeleteSceneModalData(null);
    setDeleteSceneModalError(null);
  };

  // API: Salvar Cena (Criar/Atualizar)
  const saveScene = useCallback(
    async (formData) => {
      setSceneFormModalError(null);
      const { mode, scene } = sceneFormModalData;
      const isCreateMode = mode === "create";

      let body, method, url;

      if (isCreateMode) {
        // --- MODO CRIAÇÃO ---
        body = {
          presentation_id: presentationId,
          name: formData.name,
          scene_type: formData.scene_type,
          description: formData.description,
          order: presentation?.scenes.length || 0,
        };
        method = "POST";
        url = settings.global.API.ENDPOINTS.SCENES;
      } else {
        // --- MODO EDIÇÃO ---
        // 'editBody' agora é 'body' e só é criado no 'else'
        body = {
          name: formData.name,
          description: formData.description,
          order: scene.order, // Agora 'scene' NUNCA é nulo
        };
        method = "PATCH";
        url = `${settings.global.API.ENDPOINTS.SCENES}/${scene.id}`;
      }

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          // Agora 'body' está sempre correto
          body: JSON.stringify(body),
        });

        await handleApiResponse({
          response,
          router,
          setError: setSceneFormModalError,
          onSuccess: async (data) => {
            await refetchPresentationData();
            closeSceneFormModal();
            if (isCreateMode && data) {
              setCurrentSceneId(data.id);
            }
          },
        });
      } catch (e) {
        setSceneFormModalError("Erro de conexão ao salvar a cena.");
      }
    },
    [
      router,
      refetchPresentationData,
      sceneFormModalData,
      presentationId,
      presentation?.scenes.length,
    ],
  );

  // API: Deletar Cena
  const deleteScene = useCallback(async () => {
    if (!deleteSceneModalData?.scene) return;
    setDeleteSceneModalError(null);

    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.SCENES}/${deleteSceneModalData.scene.id}`,
        { method: "DELETE" },
      );

      await handleApiResponse({
        response,
        router,
        setError: setDeleteSceneModalError,
        onSuccess: async () => {
          await refetchPresentationData();
          closeDeleteSceneModal();
          // Se deletamos a cena ativa, seleciona a primeira
          if (currentSceneId === deleteSceneModalData.scene.id) {
            // (O 'refetch' vai acionar o 'useEffect' que re-seleciona a cena 0)
            setCurrentSceneId(null);
          }
        },
      });
    } catch (e) {
      setDeleteSceneModalError("Erro de conexão ao deletar a cena.");
    }
  }, [router, refetchPresentationData, deleteSceneModalData, currentSceneId]);

  // --- FIM DA MUDANÇA ---

  return {
    // ... (props de leitura) ...
    presentation,
    isLoading,
    error,
    user,
    currentScene,
    currentSceneId,
    setCurrentSceneId,
    refetchPresentationData,
    // ... (props de editor) ...
    isEditorMode,
    setIsEditorMode,
    permissions,
    deleteElement,
    castHook,
    palette: {
      pool,
      elementTypes,
      isLoading: isLoadingPool || isLoadingElementTypes,
    },
    // --- MUDANÇA: 'modal.open' agora está conectada ---
    modal: {
      // ... (Modal de Elemento)
      isElementOpen: isElementModalOpen,
      elementData: modalData,
      elementError: modalError,
      openElement: openElementEditor,
      closeElement: closeElementModal,
      saveElement: saveElement, // Esta é a função "roteadora"
      deleteElement: deleteElement,

      // ... (Modal de Passo)
      isStepOpen: isStepModalOpen,
      stepData: stepModalData,
      stepError: stepModalError,
      openStep: openStepModal,
      closeStep: closeStepModal,
      saveStep: saveStep,

      // ... (Modal de Elenco)
      isCastOpen: isCastModalOpen,
      openCast: openCastModal,
      closeCast: closeCastModal,

      // --- MUDANÇA: Modal de Confirmação Global ---
      isGlobalEditOpen: isGlobalEditModalOpen,
      globalEditData: globalEditData,
      globalEditError: globalEditError,
      closeGlobalEdit: closeGlobalEditModal,
      updateLocally: updateElementLocally,
      updateGlobally: updateElementGlobally,

      isShareOpen: isShareModalOpen,
      shareError: shareModalError,
      openShare: openShareModal,
      closeShare: closeShareModal,
      savePublicStatus: setPresentationPublicStatus,

      isSceneFormOpen: isSceneFormModalOpen,
      sceneFormModalData: sceneFormModalData,
      sceneFormModalError: sceneFormModalError,
      openSceneForm: openSceneFormModal,
      closeSceneForm: closeSceneFormModal,
      saveScene: saveScene,

      isDeleteSceneOpen: isDeleteSceneModalOpen,
      deleteSceneModalData: deleteSceneModalData,
      deleteSceneModalError: deleteSceneModalError,
      openDeleteScene: openDeleteSceneModal,
      closeDeleteScene: closeDeleteSceneModal,
      deleteScene: deleteScene,
      // --- FIM DA MUDANÇA ---
    },
    // --- FIM DA MUDANÇA ---

    dropHandlers: {
      onPaletteDrop: handlePaletteDrop,
      onElementMove: moveElement,
    },
    stepHandlers: {
      deleteStep: deleteStep,
    },

    printHandlers: {
      ref: componentToPrintRef, // A ref para o componente "fantasma"
      onPrint: handlePrint, // A função que o botão vai chamar
    },
    // --- FIM DA MUDANÇA ---
  };
}
