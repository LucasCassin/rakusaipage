import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useRouter } from "next/navigation"; // <-- CORREÇÃO: Usar 'next/navigation'
import { usePresentation } from "./usePresentation";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings.js";
// REMOVIDO: import { usePresentationCast } from "./usePresentationCast";

export function usePresentationEditor(presentationId) {
  const router = useRouter(); // <-- CORREÇÃO: Este router é estável

  const {
    presentation,
    setPresentation,
    isLoading: isLoadingData,
    error,
    user,
    fetchData: refetchPresentationData,
  } = usePresentation(presentationId);

  // --- Estados do Editor ---
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState(null);

  // --- Estados da Paleta ---
  const [pool, setPool] = useState([]);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [elementTypes, setElementTypes] = useState([]);
  const [isLoadingElementTypes, setIsLoadingElementTypes] = useState(false);
  const [hasFetchedPaletteData, setHasFetchedPaletteData] = useState(false);

  // --- O "CÉREBRO" É O DONO DO ELENCO (Lógica movida para cá) ---
  const [viewers, setViewers] = useState([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(true);
  const [castError, setCastError] = useState(null);

  // --- Estados dos Modais ---
  const [isElementModalOpen, setIsElementModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalError, setModalError] = useState(null);

  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [stepModalData, setStepModalData] = useState(null);
  const [stepModalError, setStepModalError] = useState(null);

  const [isCastModalOpen, setIsCastModalOpen] = useState(false);

  const [isGlobalEditModalOpen, setIsGlobalEditModalOpen] = useState(false);
  const [globalEditData, setGlobalEditData] = useState(null);
  const [globalEditError, setGlobalEditError] = useState(null);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalError, setShareModalError] = useState(null);

  const [isSceneFormModalOpen, setIsSceneFormModalOpen] = useState(false);
  const [sceneFormModalData, setSceneFormModalData] = useState(null);
  const [sceneFormModalError, setSceneFormModalError] = useState(null);

  const [isDeleteSceneModalOpen, setIsDeleteSceneModalOpen] = useState(false);
  const [deleteSceneModalData, setDeleteSceneModalData] = useState(null);
  const [deleteSceneModalError, setDeleteSceneModalError] = useState(null);
  // (os 'castTriggers' não são mais necessários)

  // --- Referência de Impressão ---
  const componentToPrintRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => componentToPrintRef.current,
    documentTitle: presentation?.name || "Apresentação Rakusai",
  });

  // --- Lógica de Cena ---
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

  // --- Lógica de Permissões ---
  const permissions = useMemo(
    () => ({
      canEdit: user?.features.includes("update:presentation") || false,
      canCreateScenes: user?.features.includes("create:scene") || false,
      canUpdateScenes: user?.features.includes("update:scene") || false,
      canDeleteScenes: user?.features.includes("delete:scene") || false,
      canManageCast: user?.features.includes("create:viewer") || false,
      canReadCast: user?.features.includes("read:viewer") || false,
      canCreateStep: user?.features.includes("create:step") || false,
      canUpdateStep: user?.features.includes("update:step") || false,
      canDeleteStep: user?.features.includes("delete:step") || false,
    }),
    [user],
  );

  // --- LÓGICA DO ELENCO (Agora vive aqui) ---
  const fetchViewers = useCallback(async () => {
    if (!presentationId || !permissions.canReadCast) {
      setIsLoadingViewers(false);
      return;
    }
    setIsLoadingViewers(true);
    setCastError(null);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/viewers`,
      );
      await handleApiResponse({
        response,
        router,
        setError: setCastError,
        onSuccess: (data) => {
          setViewers(data || []);
        },
      });
    } catch (e) {
      setCastError("Erro de conexão ao buscar elenco.");
    } finally {
      setIsLoadingViewers(false);
    }
  }, [presentationId, permissions.canReadCast, router]);

  const addUserToCast = useCallback(
    async (userId) => {
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/viewers`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId }),
          },
        );
        await handleApiResponse({
          response,
          router,
          setError: setCastError,
          onSuccess: async (newViewer) => {
            // --- INÍCIO DA CORREÇÃO (Bug 5 - Confirmado pelo usuário) ---
            if (
              newViewer &&
              newViewer.message !== "Usuário já estava no elenco."
            ) {
              // Como o 'newViewer' não tem 'username',
              // devemos chamar 'fetchViewers()' para recarregar a lista
              // (como você sugeriu).
              await fetchViewers();
              return true;
            }
            // (Opcional) Se o usuário já estava, também recarregamos
            // para garantir que o estado está 100% sincronizado.
            await fetchViewers();
            // --- FIM DA CORREÇÃO ---
            return false;
          },
        });
      } catch (e) {
        setCastError("Erro de conexão ao adicionar usuário.");
        return false;
      }
    },
    [presentationId, router, fetchViewers], // 'fetchViewers' já está nas dependências
  );

  const removeUserFromCast = useCallback(
    async (userId) => {
      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/viewers/${userId}`,
          { method: "DELETE" },
        );
        await handleApiResponse({
          response,
          router,
          setError: setCastError,
          onSuccess: async () => {
            await fetchViewers();
          },
        });
      } catch (e) {
        setCastError("Erro de conexão ao remover usuário.");
      }
    },
    [presentationId, router, fetchViewers],
  );

  // --- Funções de API da Paleta ---
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
        onError: (err) => console.error("Erro no Pool:", err),
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

  const fetchElementTypes = useCallback(async () => {
    if (!permissions.canEdit) return;
    setIsLoadingElementTypes(true);
    try {
      const response = await fetch(
        `${settings.global.API.ENDPOINTS.ELEMENT_TYPES || "/api/v1/element-types"}`,
      );
      await handleApiResponse({
        response,
        router,
        onError: (err) => console.error("Erro nos Tipos:", err),
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

  // Efeito para buscar os dados da paleta E o elenco UMA VEZ
  useEffect(() => {
    if (isEditorMode && !hasFetchedPaletteData && permissions.canEdit) {
      fetchPool();
      fetchElementTypes();
      if (permissions.canReadCast) {
        fetchViewers();
      }
      setHasFetchedPaletteData(true);
    }
  }, [
    isEditorMode,
    hasFetchedPaletteData,
    permissions.canEdit,
    permissions.canReadCast,
    fetchPool,
    fetchElementTypes,
    fetchViewers,
  ]);

  // --- Funções do Modal de Elemento (Mapa) ---
  const closeElementModal = () => {
    setIsElementModalOpen(false);
    setModalData(null);
    setModalError(null);
  };

  const handlePaletteDrop = (item, position) => {
    const isTemplate = item.isTemplate;
    const dataForModal = {
      mode: "create",
      position: position,
      ...item,
    };

    if (isTemplate) {
      const createBody = {
        scene_id: currentSceneId,
        element_type_id: item.element_type_id,
        display_name: item.display_name || null,
        assigned_user_id: item.assigned_user_id || null,
        position_x: (position?.x || 50).toFixed(2),
        position_y: (position?.y || 50).toFixed(2),
      };
      createElementApi(createBody, item.isTemplate, item);
    } else {
      setModalData(dataForModal);
      setIsElementModalOpen(true);
    }
  };

  const openElementEditor = (element) => {
    setModalData({
      mode: "edit",
      id: element.id,
      display_name: element.display_name,
      assigned_user_id: element.assigned_user_id,
      element_type_id: element.element_type_id,
      element_type_name: element.element_type_name,
      image_url: element.image_url, // (Para a correção do bug 'some-ícone')
    });
    setIsElementModalOpen(true);
  };

  // API: Criar Elemento (Otimista)
  const createElementApi = useCallback(
    async (body, isTemplate, visualData) => {
      const tempId = `temp-${Date.now()}`;

      // --- CORREÇÃO (Bug 1): Usar parseFloat ---
      const optimisticBody = {
        ...body,
        position_x: parseFloat(body.position_x),
        position_y: parseFloat(body.position_y),
      };
      // --- FIM DA CORREÇÃO ---

      const fakeElement = {
        ...optimisticBody, // Usa o body corrigido
        id: tempId,
        element_type_name: visualData.element_type_name,
        image_url: visualData.image_url,
        scale: visualData.scale,
        image_url_highlight: visualData.image_url_highlight,
      };

      setPresentation((prevPresentation) => {
        const newPresentation = JSON.parse(JSON.stringify(prevPresentation));
        const scene = newPresentation.scenes.find(
          (s) => s.id === currentSceneId,
        );
        if (!scene) return prevPresentation;
        if (!scene.scene_elements) {
          scene.scene_elements = [];
        }
        scene.scene_elements.push(fakeElement);
        return newPresentation;
      });

      closeElementModal();

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.SCENES}/${currentSceneId}/elements`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body), // Envia o 'body' original (com strings) para a API
          },
        );

        await handleApiResponse({
          response,
          router,
          setError: (msg) => {
            console.error("Erro ao criar elemento, revertendo:", msg);
            refetchPresentationData();
          },
          onSuccess: (realElement) => {
            // A API retorna números, mas os dados visuais estão no fakeElement
            const finalElement = {
              ...realElement,
              image_url: fakeElement.image_url,
              element_type_name: fakeElement.element_type_name,
              scale: fakeElement.scale,
              image_url_highlight: fakeElement.image_url_highlight,
            };
            setPresentation((prevPresentation) => {
              const newPresentation = JSON.parse(
                JSON.stringify(prevPresentation),
              );
              const scene = newPresentation.scenes.find(
                (s) => s.id === currentSceneId,
              );
              if (!scene) return prevPresentation;
              const elementIndex = scene.scene_elements.findIndex(
                (el) => el.id === tempId,
              );
              if (elementIndex > -1) {
                scene.scene_elements[elementIndex] = finalElement;
              }
              return newPresentation;
            });
            if (!isTemplate && body.display_name) fetchPool();
          },
        });
      } catch (e) {
        console.error("Erro de conexão ao criar elemento, revertendo:", e);
        refetchPresentationData();
      }
    },
    [
      router,
      refetchPresentationData,
      fetchPool,
      currentSceneId,
      setPresentation,
    ],
  );

  // Função "Roteadora" (Salvar do Modal de Elemento)
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

      if (isCreateMode) {
        const createBody = {
          scene_id: currentSceneId,
          element_type_id: formData.element_type_id,
          display_name: newName || null,
          assigned_user_id: newUserId || null,
          position_x: (formData.position?.x || 50).toFixed(2),
          position_y: (formData.position?.y || 50).toFixed(2),
        };
        const visualData = {
          isTemplate: formData.isTemplate,
          element_type_name: modalData.element_type_name,
          image_url: modalData.image_url,
        };
        await createElementApi(createBody, visualData.isTemplate, visualData);
      } else {
        const nameChanged = newName !== (oldName || "");
        const userChanged = newUserId !== (oldUserId || "");

        if (!nameChanged && !userChanged) {
          closeElementModal();
          return;
        }

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
    [modalData, currentSceneId, createElementApi],
  );

  // API: Atualizar Local
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

  // API: Atualizar Global
  const updateElementGlobally = useCallback(async () => {
    setGlobalEditError(null);
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
          fetchPool();
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

  // API: Mover Elemento (Otimista)
  const moveElement = useCallback(
    async (elementId, position) => {
      if (!elementId || !position) return;

      // --- CORREÇÃO (Bug 1): Usar parseFloat ---
      const numericPosition = {
        x: parseFloat(position.x.toFixed(2)),
        y: parseFloat(position.y.toFixed(2)),
      };
      // --- FIM DA CORREÇÃO ---

      setPresentation((prevPresentation) => {
        const newPresentation = JSON.parse(JSON.stringify(prevPresentation));
        const scene = newPresentation.scenes.find(
          (s) => s.id === currentSceneId,
        );
        if (!scene) return prevPresentation;
        const element = scene.scene_elements.find((el) => el.id === elementId);
        if (!element) return prevPresentation;

        // Salva como NÚMERO
        element.position_x = numericPosition.x;
        element.position_y = numericPosition.y;
        return newPresentation;
      });

      const body = {
        position_x: numericPosition.x, // Envia o número (API aceita)
        position_y: numericPosition.y,
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
            refetchPresentationData();
          },
          onSuccess: () => {
            // Não faz nada (otimista)
          },
        });
      } catch (e) {
        console.error("Erro de conexão ao mover elemento:", e);
        refetchPresentationData();
      }
    },
    [router, refetchPresentationData, currentSceneId, setPresentation],
  );

  // API: Deletar Elemento (Otimista)
  const deleteElement = useCallback(
    async (elementId) => {
      setModalError(null);
      closeElementModal();

      setPresentation((prevPresentation) => {
        const newPresentation = JSON.parse(JSON.stringify(prevPresentation));
        const scene = newPresentation.scenes.find(
          (s) => s.id === currentSceneId,
        );
        if (!scene) return prevPresentation;
        scene.scene_elements = scene.scene_elements.filter(
          (el) => el.id !== elementId,
        );
        return newPresentation;
      });

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.SCENE_ELEMENTS}/${elementId}`,
          { method: "DELETE" },
        );
        await handleApiResponse({
          response,
          router,
          setError: (msg) => {
            console.error("Erro ao deletar elemento, revertendo:", msg);
            refetchPresentationData();
          },
          onSuccess: () => {
            fetchPool(); // Atualiza o pool
          },
        });
      } catch (e) {
        console.error("Erro de conexão ao deletar elemento:", e);
        refetchPresentationData();
      }
    },
    [
      router,
      refetchPresentationData,
      currentSceneId,
      setPresentation,
      fetchPool,
    ],
  );

  // --- Funções do Modal de Passo (Checklist) ---
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

  // API: Salvar Passo
  const saveStep = useCallback(
    async (formData) => {
      setStepModalError(null);
      const { mode, step } = stepModalData;
      const isCreateMode = mode === "create";

      const sceneId = currentSceneId;
      let tempId = null; // Para o 'create' otimista
      let optimisticStep; // O "fantasma"

      let body, method, url;

      if (isCreateMode) {
        tempId = `temp-step-${Date.now()}`;
        body = {
          scene_id: sceneId,
          description: formData.description,
          assigned_user_id: formData.assigned_user_id || null,
          order: currentScene?.transition_steps.length || 0,
        };
        method = "POST";
        url = `${settings.global.API.ENDPOINTS.SCENES}/${sceneId}/steps`;
        optimisticStep = { ...body, id: tempId };
      } else {
        // Modo Edição
        body = {
          description: formData.description,
          assigned_user_id: formData.assigned_user_id || null,
          order: formData.order, // (Vem do estado do formulário)
        };
        method = "PATCH";
        url = `${settings.global.API.ENDPOINTS.TRANSITION_STEPS}/${step.id}`;
        optimisticStep = { ...step, ...body };
      }

      // --- ATUALIZAÇÃO OTIMISTA (LOCAL) ---
      setPresentation((prevPresentation) => {
        const newPresentation = JSON.parse(JSON.stringify(prevPresentation));
        const scene = newPresentation.scenes.find((s) => s.id === sceneId);
        if (!scene) return prevPresentation;

        if (isCreateMode) {
          scene.transition_steps.push(optimisticStep);
        } else {
          const stepIndex = scene.transition_steps.findIndex(
            (s) => s.id === step.id,
          );
          if (stepIndex > -1) {
            scene.transition_steps[stepIndex] = optimisticStep;
          }
        }
        return newPresentation;
      });

      closeStepModal();
      // --- FIM DA ATUALIZAÇÃO OTIMISTA ---

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        await handleApiResponse({
          response,
          router,
          setError: (msg) => {
            console.error("Erro ao salvar passo, revertendo:", msg);
            refetchPresentationData(); // Reverte em caso de erro
          },
          onSuccess: (realStep) => {
            // SUCESSO. Troca o "fantasma" (se for 'create')
            setPresentation((prevPresentation) => {
              const newPresentation = JSON.parse(
                JSON.stringify(prevPresentation),
              );
              const scene = newPresentation.scenes.find(
                (s) => s.id === sceneId,
              );
              if (!scene) return prevPresentation;

              const stepIndex = scene.transition_steps.findIndex(
                (s) => s.id === (isCreateMode ? tempId : step.id),
              );

              if (stepIndex > -1) {
                scene.transition_steps[stepIndex] = realStep;
              }
              return newPresentation;
            });
          },
        });
      } catch (e) {
        console.error("Erro de conexão ao salvar passo, revertendo:", e);
        refetchPresentationData();
      }
    },
    [
      router,
      refetchPresentationData,
      currentSceneId,
      currentScene,
      stepModalData,
      setPresentation, // <-- Adicionado
    ],
  );

  // API: Deletar Passo (OTIMISTA E COM RE-INDEXAÇÃO)
  const deleteStep = useCallback(
    async (stepId) => {
      const sceneId = currentSceneId; // Pega a cena atual

      // --- ATUALIZAÇÃO OTIMISTA (LOCAL) ---
      setPresentation((prevPresentation) => {
        const newPresentation = JSON.parse(JSON.stringify(prevPresentation));
        const scene = newPresentation.scenes.find((s) => s.id === sceneId);
        if (!scene) return prevPresentation;

        // 1. Filtra o passo deletado
        scene.transition_steps = scene.transition_steps.filter(
          (s) => s.id !== stepId,
        );

        // --- MUDANÇA (CORREÇÃO DO BUG DE ORDEM) ---
        // 2. Re-indexa a 'order' dos passos restantes
        scene.transition_steps.forEach((step, index) => {
          step.order = index;
        });
        // --- FIM DA MUDANÇA ---

        return newPresentation;
      });
      // --- FIM DA ATUALIZAÇÃO OTIMISTA ---

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.TRANSITION_STEPS}/${stepId}`,
          { method: "DELETE" },
        );

        await handleApiResponse({
          response,
          router,
          setError: (msg) => {
            console.error("Erro ao deletar passo, revertendo:", msg);
            refetchPresentationData(); // Reverte
          },
          onSuccess: () => {
            // Não faz nada, a UI (com re-indexação) já foi atualizada
            // (Para 100% de correção, deveríamos chamar uma API de re-ordenação,
            // mas o refetch() resolveria isso se a UI não fosse otimista)
          },
        });
      } catch (e) {
        console.error("Erro de conexão ao deletar passo, revertendo:", e);
        refetchPresentationData();
      }
    },
    [router, refetchPresentationData, currentSceneId, setPresentation],
  );

  // --- Funções do Modal de Elenco (Cast) ---
  const openCastModal = () => {
    setIsCastModalOpen(true);
  };

  const closeCastModal = () => {
    setIsCastModalOpen(false);
  };

  // --- Funções do Modal de Compartilhamento ---
  const openShareModal = () => {
    setIsShareModalOpen(true);
    setShareModalError(null);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setShareModalError(null);
  };

  // API: Salvar Status Público
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
          setError: setShareModalError,
          onSuccess: () => {
            refetchPresentationData();
            closeShareModal();
          },
        });
      } catch (e) {
        setShareModalError("Erro de conexão. Verifique sua internet.");
        console.error("Erro ao atualizar status público:", e);
      }
    },
    [router, refetchPresentationData, presentationId],
  );

  // --- MUDANÇA: Novas Funções do Modal de CENA ---
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
        body = {
          name: formData.name,
          description: formData.description,
          order: scene.order,
        };
        method = "PATCH";
        url = `${settings.global.API.ENDPOINTS.SCENES}/${scene.id}`;
      }

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
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
          if (currentSceneId === deleteSceneModalData.scene.id) {
            setCurrentSceneId(null);
          }
        },
      });
    } catch (e) {
      setDeleteSceneModalError("Erro de conexão ao deletar a cena.");
    }
  }, [router, refetchPresentationData, deleteSceneModalData, currentSceneId]);

  const moveScene = useCallback(
    (dragIndex, hoverIndex) => {
      setPresentation((prev) => {
        const newPresentation = { ...prev };
        const newScenes = [...newPresentation.scenes];

        // Remove a cena da posição antiga
        const [draggedScene] = newScenes.splice(dragIndex, 1);
        // Insere na nova posição
        newScenes.splice(hoverIndex, 0, draggedScene);

        // Atualiza o campo 'order' localmente para manter consistência
        newScenes.forEach((scene, index) => {
          scene.order = index;
        });

        newPresentation.scenes = newScenes;
        return newPresentation;
      });
    },
    [setPresentation],
  );

  // API: Salvar Ordem das Cenas (chamado no 'onDrop')
  const saveSceneOrder = useCallback(async () => {
    // Pega a ordem atual do estado (que já foi atualizado otimisticamente)
    if (!presentation?.scenes) return;
    const sceneIds = presentation.scenes.map((s) => s.id);

    try {
      await fetch(
        `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/scenes`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scene_ids: sceneIds }),
        },
      );
      // Não precisamos de 'handleApiResponse' completo aqui,
      // pois se falhar silenciosamente, o próximo 'refetch' corrige.
      // Ou podemos adicionar um 'toast' de erro se você tiver um sistema de toast.
    } catch (e) {
      console.error("Erro ao salvar ordem das cenas:", e);
      refetchPresentationData(); // Reverte em caso de erro grave
    }
  }, [presentation, presentationId, refetchPresentationData]);

  const mergeElements = useCallback(
    async (targetElement, draggedElement) => {
      // Impede a fusão de um item nele mesmo
      if (
        !targetElement ||
        !draggedElement ||
        targetElement.group_id === draggedElement.group_id
      ) {
        return;
      }

      const payload = {
        targetGroupId: targetElement.group_id,
        sourceGroupId: draggedElement.group_id,
      };

      // --- ATUALIZAÇÃO OTIMISTA ---
      // Remove o elemento arrastado (draggedElement) da cena localmente,
      // pois ele foi "absorvido".
      setPresentation((prevPresentation) => {
        const newPresentation = JSON.parse(JSON.stringify(prevPresentation));
        const scene = newPresentation.scenes.find(
          (s) => s.id === currentSceneId,
        );
        if (!scene) return prevPresentation;

        scene.scene_elements = scene.scene_elements.filter(
          (el) => el.id !== draggedElement.id,
        );
        return newPresentation;
      });
      // --- FIM DA ATUALIZAÇÃO OTIMISTA ---

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.ELEMENT_GROUPS}/merge`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        // O 'handleApiResponse' cuidará de erros (4xx, 5xx)
        // Usamos 'refetchPresentationData' em AMBOS os casos (sucesso ou erro)
        // para garantir que a UI reflita 100% o estado do banco.
        // (O 'onSuccess' poderia ser mais otimista, mas 'refetch' é mais seguro
        // para garantir que o pool de nomes seja atualizado).
        await handleApiResponse({
          response,
          router,
          setError: (msg) => {
            console.error("Erro ao fundir elementos, revertendo:", msg);
            refetchPresentationData();
          },
          onSuccess: () => {
            refetchPresentationData(); // Busca o estado final do backend
            fetchPool(); // Atualiza o pool (pois o nome do grupo pode ter mudado)
          },
        });
      } catch (e) {
        console.error("Erro de conexão ao fundir elementos:", e);
        refetchPresentationData(); // Reverte
      }
    },
    [
      router,
      refetchPresentationData,
      currentSceneId,
      setPresentation,
      fetchPool,
    ],
  );

  return {
    // Dados de Leitura
    presentation,
    isLoading: isLoadingData,
    error,
    user,
    currentScene,
    currentSceneId,
    setCurrentSceneId,
    refetchPresentationData,
    // Props do Editor
    isEditorMode,
    setIsEditorMode,
    permissions,
    // 'castHook' agora é montado manualmente
    castHook: {
      viewers,
      isLoading: isLoadingViewers,
      error: castError,
      fetchViewers,
      addUserToCast, // Passa a função local
      removeUserFromCast, // Passa a função local
    },
    palette: {
      pool,
      elementTypes,
      isLoading: isLoadingPool || isLoadingElementTypes,
    },
    // Modais
    modal: {
      isElementOpen: isElementModalOpen,
      elementData: modalData,
      elementError: modalError,
      openElement: openElementEditor,
      closeElement: closeElementModal,
      saveElement: saveElement,
      deleteElement: deleteElement,

      isStepOpen: isStepModalOpen,
      stepData: stepModalData,
      stepError: stepModalError,
      openStep: openStepModal,
      closeStep: closeStepModal,
      saveStep: saveStep,

      isCastOpen: isCastModalOpen,
      openCast: openCastModal,
      closeCast: closeCastModal,

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
    },
    // Handlers DND
    dropHandlers: {
      onPaletteDrop: handlePaletteDrop,
      onElementMove: moveElement,
      onElementMerge: mergeElements,
    },
    // Handlers de Passo
    stepHandlers: {
      deleteStep: deleteStep,
    },
    // Handlers de Impressão
    printHandlers: {
      ref: componentToPrintRef,
      onPrint: handlePrint,
    },
    reorderHandlers: {
      moveScene: moveScene,
      saveSceneOrder: saveSceneOrder,
    },
  };
}
