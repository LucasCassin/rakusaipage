import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { usePresentation } from "./usePresentation";
import { useAuth } from "src/contexts/AuthContext";
import { handleApiResponse } from "src/utils/handleApiResponse";
import { settings } from "config/settings.js";

/**
 * Hook "cérebro" para gerenciar O ESTADO COMPLETO do editor de apresentações.
 * Ele envolve o 'usePresentation' (para dados) e adiciona os estados de UI
 * e as funções de escrita (API).
 */
export function usePresentationEditor(presentationId) {
  const router = useRouter();

  // 1. Pega os dados base (loading, erro, usuário, dados da apresentação)
  const {
    presentation,
    isLoading: isLoadingData,
    error,
    user,
    fetchData: refetchPresentationData,
  } = usePresentation(presentationId);

  // 2. Estados específicos do Editor
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState(null);

  // --- MUDANÇA: Estados da Paleta ---
  const [pool, setPool] = useState([]);
  const [isLoadingPool, setIsLoadingPool] = useState(false);
  const [elementTypes, setElementTypes] = useState([]); // "Catálogo"
  const [isLoadingElementTypes, setIsLoadingElementTypes] = useState(false);
  const [hasFetchedPaletteData, setHasFetchedPaletteData] = useState(false);
  // --- FIM DA MUDANÇA ---

  // 3. Lógica de Cena (movida da página [id].js para este hook)
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

  // 4. Lógica de Permissões (para a UI)
  const permissions = useMemo(
    () => ({
      canEdit: user?.features.includes("update:presentation") || false,
      canCreateScenes: user?.features.includes("create:scene") || false,
      canDeleteScenes: user?.features.includes("delete:scene") || false,
      canManageCast: user?.features.includes("create:viewer") || false,
      // (Adicionaremos mais "chaves" aqui conforme necessário)
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

  // --- MUDANÇA: Efeito para buscar os dados da paleta UMA VEZ ---
  useEffect(() => {
    // Se o modo editor for ativado E ainda não buscamos os dados
    if (isEditorMode && !hasFetchedPaletteData && permissions.canEdit) {
      fetchPool();
      fetchElementTypes();
      setHasFetchedPaletteData(true); // Marca como buscado
    }
  }, [
    isEditorMode,
    hasFetchedPaletteData,
    permissions.canEdit,
    fetchPool,
    fetchElementTypes,
  ]);
  // --- FIM DA MUDANÇA ---

  // 6. Retorno do Hook
  return {
    // Dados e Estados de Leitura
    presentation,
    isLoading: isLoadingData,
    error,
    user,
    currentScene,
    currentSceneId,

    // Funções de Leitura
    setCurrentSceneId,
    refetchPresentationData,

    // Estados e Funções do Editor
    isEditorMode,
    setIsEditorMode,
    permissions,

    // --- MUDANÇA: Expor os dados da Paleta ---
    palette: {
      pool,
      elementTypes,
      isLoading: isLoadingPool || isLoadingElementTypes,
    },
    // --- FIM DA MUDANÇA ---
  };
}
