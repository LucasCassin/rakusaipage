import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { useRouter } from "next/navigation";
import { usePresentation } from "./usePresentation";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings.js";
import { useMessage } from "./useMessage";
import { toPng } from "html-to-image";

const CLIPBOARD_KEY = "rakusai_scene_clipboard";

export function usePresentationEditor(presentationId) {
  const router = useRouter();

  const {
    presentation,
    setPresentation,
    isLoading: isLoadingData,
    error,
    user,
    fetchData: refetchPresentationData,
  } = usePresentation(presentationId);

  const [isEditorMode, setIsEditorMode] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState(null);

  const [pool, setPool] = useState([]);
  const [paletteOpenSections, setPaletteOpenSections] = useState({
    pool: true,
    catalog: false,
  });
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [elementTypes, setElementTypes] = useState([]);
  const [isLoadingElementTypes, setIsLoadingElementTypes] = useState(false);
  const [hasFetchedPaletteData, setHasFetchedPaletteData] = useState(false);

  const [viewers, setViewers] = useState([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(true);
  const [castError, setCastError] = useState(null);

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

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteModalError, setPasteModalError] = useState(null);

  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

  const [clipboardContent, setClipboardContent] = useState(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printComments, setPrintComments] = useState("");
  const [printIsCompact, setPrintIsCompact] = useState(false);

  const {
    success: globalSuccessMessage,
    setSuccess: setGlobalSuccessMessage,
    clearSuccess: clearGlobalSuccessMessage,
    setError: setGlobalErrorMessage,
    clearError: clearGlobalErrorMessage,
  } = useMessage();

  const componentToPrintRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: componentToPrintRef,
    documentTitle: presentation?.name || "Apresentação Rakusai",
  });

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

  const togglePaletteSection = useCallback((sectionName) => {
    setPaletteOpenSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  }, []);

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
      console.error("Erro ao buscar elenco:", e);
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
            if (
              newViewer &&
              newViewer.message !== "Usuário já estava no elenco."
            ) {
              await fetchViewers();
              return true;
            }

            await fetchViewers();

            return false;
          },
        });
      } catch (e) {
        setCastError("Erro de conexão ao adicionar usuário.");
        console.error("Erro ao adicionar usuário ao elenco:", e);
        return false;
      }
    },
    [presentationId, router, fetchViewers],
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
        console.error("Erro ao remover usuário do elenco:", e);
      }
    },
    [presentationId, router, fetchViewers],
  );

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
        assignees: item.assignees || null,
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
      assignees: element.assignees,
      element_type_id: element.element_type_id,
      element_type_name: element.element_type_name,
      image_url: element.image_url,
    });
    setIsElementModalOpen(true);
  };

  const createElementApi = useCallback(
    async (body, isTemplate, visualData) => {
      const tempId = `temp-${Date.now()}`;

      const optimisticBody = {
        ...body,
        position_x: parseFloat(body.position_x),
        position_y: parseFloat(body.position_y),
      };

      const fakeElement = {
        ...optimisticBody,
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

      if (!isTemplate && body.display_name) {
        setPool((prevPool) => {
          const exists = prevPool.some(
            (p) =>
              p.element_type_id === body.element_type_id &&
              p.display_name === body.display_name,
          );
          if (exists) return prevPool;

          const fakePoolItem = {
            element_type_id: body.element_type_id,
            display_name: body.display_name,
            assignees: body.assignees || [],
            element_type_name: visualData.element_type_name,
            image_url: visualData.image_url,
            scale: visualData.scale,
            image_url_highlight: visualData.image_url_highlight,
          };

          return [...prevPool, fakePoolItem];
        });
      }

      closeElementModal();

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
          setError: (msg) => {
            console.error("Erro ao criar elemento, revertendo:", msg);
            refetchPresentationData();
          },
          onSuccess: (realElement) => {
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

  const saveElement = useCallback(
    async (formData) => {
      setModalError(null);

      const {
        mode,
        id,
        display_name: oldName,
        assignees: oldUserId,
      } = modalData;
      const { display_name: newName, assignees: newUserId } = formData;

      const isCreateMode = mode === "create";

      if (isCreateMode) {
        const createBody = {
          scene_id: currentSceneId,
          element_type_id: formData.element_type_id,
          display_name: newName || null,
          assignees: newUserId || null,
          position_x: (formData.position?.x || 50).toFixed(4),
          position_y: (formData.position?.y || 50).toFixed(4),
        };
        const visualData = {
          isTemplate: formData.isTemplate,
          element_type_name: modalData.element_type_name,
          image_url: modalData.image_url,
          scale: modalData.scale,
          image_url_highlight: modalData.image_url_highlight,
        };
        await createElementApi(createBody, visualData.isTemplate, visualData);
      } else {
        const nameChanged = newName !== (oldName || []);
        const userChanged = newUserId !== (oldUserId || []);

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
            assignees: oldUserId || null,
          },
          newData: {
            display_name: newName || null,
            assignees: newUserId || null,
          },
        });
        setIsGlobalEditModalOpen(true);
      }
    },
    [modalData, currentSceneId, createElementApi],
  );

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

  const updateElementGlobally = useCallback(async () => {
    setGlobalEditError(null);
    const body = {
      element_type_id: globalEditData.element_type_id,
      old_display_name: globalEditData.oldData.display_name,
      new_display_name: globalEditData.newData.display_name,
      new_assignees: globalEditData.newData.assignees,
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

  const moveElement = useCallback(
    async (elementId, position) => {
      if (!elementId || !position) return;

      const numericPosition = {
        x: parseFloat(position.x.toFixed(4)),
        y: parseFloat(position.y.toFixed(4)),
      };

      setPresentation((prevPresentation) => {
        const newPresentation = JSON.parse(JSON.stringify(prevPresentation));
        const scene = newPresentation.scenes.find(
          (s) => s.id === currentSceneId,
        );
        if (!scene) return prevPresentation;
        const element = scene.scene_elements.find((el) => el.id === elementId);
        if (!element) return prevPresentation;

        element.position_x = numericPosition.x;
        element.position_y = numericPosition.y;
        return newPresentation;
      });

      const body = {
        position_x: numericPosition.x,
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
          onSuccess: () => {},
        });
      } catch (e) {
        console.error("Erro de conexão ao mover elemento:", e);
        refetchPresentationData();
      }
    },
    [router, refetchPresentationData, currentSceneId, setPresentation],
  );

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
            fetchPool();
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

      const sceneId = currentSceneId;
      let tempId = null;
      let optimisticStep;

      let body, method, url;

      if (isCreateMode) {
        tempId = `temp-step-${Date.now()}`;
        body = {
          scene_id: sceneId,
          description: formData.description,
          assignees: formData.assignees || null,
          order: currentScene?.transition_steps.length || 0,
        };
        method = "POST";
        url = `${settings.global.API.ENDPOINTS.SCENES}/${sceneId}/steps`;
        optimisticStep = { ...body, id: tempId };
      } else {
        body = {
          description: formData.description,
          assignees: formData.assignees || null,
          order: formData.order,
        };
        method = "PATCH";
        url = `${settings.global.API.ENDPOINTS.TRANSITION_STEPS}/${step.id}`;
        optimisticStep = { ...step, ...body };
      }

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
            refetchPresentationData();
          },
          onSuccess: (realStep) => {
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
      setPresentation,
    ],
  );

  const deleteStep = useCallback(
    async (stepId) => {
      const sceneId = currentSceneId;

      setPresentation((prevPresentation) => {
        const newPresentation = JSON.parse(JSON.stringify(prevPresentation));
        const scene = newPresentation.scenes.find((s) => s.id === sceneId);
        if (!scene) return prevPresentation;

        scene.transition_steps = scene.transition_steps.filter(
          (s) => s.id !== stepId,
        );

        scene.transition_steps.forEach((step, index) => {
          step.order = index;
        });

        return newPresentation;
      });

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
            refetchPresentationData();
          },
          onSuccess: () => {},
        });
      } catch (e) {
        console.error("Erro de conexão ao deletar passo, revertendo:", e);
        refetchPresentationData();
      }
    },
    [router, refetchPresentationData, currentSceneId, setPresentation],
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
        console.error("Erro ao salvar cena:", e);
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
          fetchPool();
          if (currentSceneId === deleteSceneModalData.scene.id) {
            setCurrentSceneId(null);
          }
        },
      });
    } catch (e) {
      setDeleteSceneModalError("Erro de conexão ao deletar a cena.");
      console.error("Erro ao deletar cena:", e);
    }
  }, [router, refetchPresentationData, deleteSceneModalData, currentSceneId]);

  const moveScene = useCallback(
    (dragIndex, hoverIndex) => {
      setPresentation((prev) => {
        const newPresentation = { ...prev };
        const newScenes = [...newPresentation.scenes];

        const [draggedScene] = newScenes.splice(dragIndex, 1);

        newScenes.splice(hoverIndex, 0, draggedScene);

        newScenes.forEach((scene, index) => {
          scene.order = index;
        });

        newPresentation.scenes = newScenes;
        return newPresentation;
      });
    },
    [setPresentation],
  );

  const saveSceneOrder = useCallback(async () => {
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
    } catch (e) {
      console.error("Erro ao salvar ordem das cenas:", e);
      refetchPresentationData();
    }
  }, [presentation, presentationId, refetchPresentationData]);

  const mergeElements = useCallback(
    async (targetElement, draggedElement) => {
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

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.ELEMENT_GROUPS}/merge`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        await handleApiResponse({
          response,
          router,
          setError: (msg) => {
            console.error("Erro ao fundir elementos, revertendo:", msg);
            refetchPresentationData();
          },
          onSuccess: () => {
            refetchPresentationData();
            fetchPool();
          },
        });
      } catch (e) {
        console.error("Erro de conexão ao fundir elementos:", e);
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

  useEffect(() => {
    try {
      const data = localStorage.getItem(CLIPBOARD_KEY);
      if (data) {
        setClipboardContent(JSON.parse(data));
      }
    } catch (e) {
      console.error("Erro ao ler clipboard:", e);
      localStorage.removeItem(CLIPBOARD_KEY);
    }
  }, []);

  const copyScene = useCallback(
    (sceneToCopy) => {
      try {
        const data = JSON.stringify(sceneToCopy);
        localStorage.setItem(CLIPBOARD_KEY, data);
        setClipboardContent(sceneToCopy);
        setGlobalSuccessMessage(`Cena "${sceneToCopy.name}" copiada!`);
        setTimeout(() => {
          setGlobalSuccessMessage(null);
        }, 3000);
      } catch (e) {
        console.error("Erro ao copiar cena:", e);
      }
    },
    [setGlobalSuccessMessage],
  );

  const openPasteModal = () => {
    setPasteModalError(null);
    setIsPasteModalOpen(true);
  };

  const closePasteModal = () => {
    setIsPasteModalOpen(false);
  };

  const openStatsModal = () => setIsStatsModalOpen(true);
  const closeStatsModal = () => setIsStatsModalOpen(false);

  const handlePasteScene = useCallback(
    async (pasteOption) => {
      if (!clipboardContent) {
        setPasteModalError("Nenhuma cena encontrada no clipboard.");
        return;
      }

      setPasteModalError(null);

      try {
        const response = await fetch(
          `${settings.global.API.ENDPOINTS.PRESENTATIONS}/${presentationId}/scenes/clone`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sceneData: clipboardContent,
              pasteOption: pasteOption,
            }),
          },
        );

        await handleApiResponse({
          response,
          router,
          setError: setPasteModalError,
          onSuccess: async (newScene) => {
            await refetchPresentationData();
            fetchPool();
            closePasteModal();
            setCurrentSceneId(newScene.id);
          },
          onError: () => {
            setClipboardContent(null);
          },
        });
      } catch (e) {
        setPasteModalError("Erro de conexão ao colar a cena.");
        console.error("Erro ao colar cena:", e);
      }
    },
    [clipboardContent, presentationId, router, refetchPresentationData],
  );

  const openPrintModal = () => {
    setPrintComments("");
    setIsPrintModalOpen(true);
  };

  const closePrintModal = () => {
    setIsPrintModalOpen(false);
  };

  const handleProcessPrint = useCallback(
    (comments, isCompact) => {
      setPrintComments(comments);
      setPrintIsCompact(isCompact);

      setIsPrintModalOpen(false);
      setTimeout(() => {
        handlePrint();
      }, 200);
    },
    [handlePrint],
  );

  const handleDownloadPng = useCallback(
    async (comments, isCompact) => {
      setPrintComments(comments);
      setPrintIsCompact(isCompact);
      setIsPrintModalOpen(false);

      setTimeout(async () => {
        if (componentToPrintRef.current === null) return;

        try {
          const dataUrl = await toPng(componentToPrintRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            backgroundColor: "white",
            style: {
              visibility: "visible",
              position: "static",
              left: "0",
              top: "0",
              transform: "none",
            },
          });

          const link = document.createElement("a");
          const modeName = isCompact ? "compacto" : "completo";
          link.download = `${presentation?.name || "apresentacao"}-${modeName}.png`;
          link.href = dataUrl;
          link.click();

          setGlobalSuccessMessage("Imagem gerada com sucesso!");
          setTimeout(() => clearGlobalSuccessMessage(), 3000);
        } catch (err) {
          console.error("Erro ao gerar imagem:", err);
          setGlobalErrorMessage("Erro ao gerar imagem.");
          setTimeout(() => clearGlobalErrorMessage(), 3000);
        }
      }, 500);
    },
    [presentation, setGlobalSuccessMessage, clearGlobalSuccessMessage],
  );

  return {
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

    clipboardContent,

    globalSuccessMessage,
    clearGlobalSuccessMessage,

    castHook: {
      viewers,
      isLoading: isLoadingViewers,
      error: castError,
      fetchViewers,
      addUserToCast,
      removeUserFromCast,
    },
    palette: {
      pool,
      elementTypes,
      isLoading: isLoadingPool || isLoadingElementTypes,
      openSections: paletteOpenSections,
      toggleSection: togglePaletteSection,
    },

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

      isPasteOpen: isPasteModalOpen,
      pasteError: pasteModalError,
      openPaste: openPasteModal,
      closePaste: closePasteModal,
      handlePaste: handlePasteScene,

      isStatsOpen: isStatsModalOpen,
      openStats: openStatsModal,
      closeStats: closeStatsModal,

      handleCopy: copyScene,

      isPrintOpen: isPrintModalOpen,
      openPrint: openPrintModal,
      closePrint: closePrintModal,
      processPrint: handleProcessPrint,
      processPng: handleDownloadPng,
    },

    printData: {
      comments: printComments,
      isCompact: printIsCompact,
    },

    dropHandlers: {
      onPaletteDrop: handlePaletteDrop,
      onElementMove: moveElement,
      onElementMerge: mergeElements,
    },

    stepHandlers: {
      deleteStep: deleteStep,
    },

    printHandlers: {
      ref: componentToPrintRef,
      onPrint: openPrintModal,
    },
    reorderHandlers: {
      moveScene: moveScene,
      saveSceneOrder: saveSceneOrder,
    },
  };
}
