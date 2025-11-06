import { useState, useEffect, useMemo, useCallback } from "react";
import { useUserSearchByFeatures } from "./useUserSearchByFeatures";
import { useUserSearch } from "./useUserSearch"; // <-- 1. IMPORTAR O NOVO HOOK
import { useMessage } from "./useMessage"; // <-- 2. IMPORTAR useMessage
import { useSetFieldError } from "./useSetFieldError";

/**
 * Hook para gerenciar a "Busca Híbrida" para o elenco.
 * AGORA gerencia 'useUserSearchByFeatures' E 'useUserSearch'.
 */
export function useCastSearch(currentCastViewers = []) {
  // --- 1. HOOK DE BUSCA POR GRUPO (Bulk) ---
  const {
    users: searchResults,
    isLoading: isLoadingSearch,
    error: searchError,
    hasSearched,
    searchUsers: runSearchByFeatures,
    clearSearch: clearSearchByFeatures,
  } = useUserSearchByFeatures();

  // --- 2. HOOK DE BUSCA INDIVIDUAL (Single) ---
  const [searchTerm, setSearchTerm] = useState("");
  const [individualSearchResult, setIndividualSearchResult] = useState(null);
  // Mensagens de erro separadas para a busca individual
  const individualMessage = useMessage();
  const individualFieldErrors = useSetFieldError();

  const {
    isLoading: isLoadingIndividual,
    userFound: individualUserFound, // 'userFound' é o objeto do usuário
    setUserFound: setIndividualUserFound,
    fetchUserData: runSearchByUsername,
  } = useUserSearch({
    messageHandlers: individualMessage,
    setFieldErrorsHandlers: individualFieldErrors,
    onSuccessCallback: (user) => {
      setIndividualSearchResult(user); // Guarda o usuário encontrado
    },
    resetCallback: () => {
      setIndividualSearchResult(null);
    },
  });

  // 3. Estado de seleção (para a lista 'bulk')
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());

  // 4. A "Mágica" - A lista processada (para 'bulk')
  const processedUsers = useMemo(() => {
    const castIds = new Set(currentCastViewers.map((v) => v.id));

    return searchResults.map((user) => {
      const isInCast = castIds.has(user.id);
      return {
        ...user,
        status: isInCast ? "in_cast" : "new",
        isSelected: isInCast ? false : selectedUserIds.has(user.id),
      };
    });
  }, [searchResults, currentCastViewers, selectedUserIds]);

  // 5. Efeito de pré-seleção (para 'bulk')
  useEffect(() => {
    // ... (lógica de pré-seleção permanece a mesma)
    const castIds = new Set(currentCastViewers.map((v) => v.id));
    const newUsers = searchResults
      .filter((user) => !castIds.has(user.id))
      .map((user) => user.id);
    setSelectedUserIds(new Set(newUsers));
  }, [searchResults, currentCastViewers]);

  // 6. Handlers para a UI
  const handleToggleUser = useCallback((userId) => {
    // ... (lógica do 'handleToggleUser' permanece a mesma)
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) newSet.delete(userId);
      else newSet.add(userId);
      return newSet;
    });
  }, []);

  // 7. Limpar TUDO
  const clearSearch = useCallback(() => {
    clearSearchByFeatures();
    setSelectedUserIds(new Set());
    // Limpa também a busca individual
    setSearchTerm("");
    setIndividualUserFound(false);
    setIndividualSearchResult(null);
    individualMessage.clearAll();
    individualFieldErrors.clearAllFieldError();
  }, [
    clearSearchByFeatures,
    setIndividualUserFound,
    individualMessage,
    individualFieldErrors,
  ]);

  return {
    // Hooks de Busca por Grupo (Bulk)
    processedUsers,
    isLoadingSearch,
    searchError,
    hasSearched,
    runSearchByFeatures,

    // Hooks de Busca Individual (Single)
    searchTerm,
    setSearchTerm,
    isLoadingIndividual,
    individualSearchResult,
    individualSearchError:
      individualMessage.error || individualFieldErrors.fieldErrors?.username, // <-- MUDANÇA: Combinar erros
    runSearchByUsername,

    // Funções de Limpeza e Seleção
    clearSearch,
    selectedUserIds,
    handleToggleUser,
  };
}
