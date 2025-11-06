import { useState, useEffect, useMemo, useCallback } from "react";
import { useUserSearchByFeatures } from "./useUserSearchByFeatures"; //
// (Vamos precisar do useUserSearch (individual) também, mas vamos focar no 'bulk' primeiro)

/**
 * Hook para gerenciar a "Busca Híbrida" para o elenco.
 * Ele envolve 'useUserSearchByFeatures' e adiciona a lógica de
 * filtragem e seleção.
 */
export function useCastSearch(currentCastViewers = []) {
  // 1. O hook base para a busca por features
  const {
    users: searchResults,
    isLoading: isLoadingSearch,
    error: searchError,
    hasSearched,
    searchUsers: runSearchByFeatures,
    clearSearch: clearSearchByFeatures,
  } = useUserSearchByFeatures();

  // 2. Estado para os usuários selecionados
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());

  // 3. A "Mágica" - A lista processada
  // Este 'useMemo' roda sempre que a 'searchResults' ou 'currentCastViewers' muda.
  const processedUsers = useMemo(() => {
    // Cria um Set com os IDs do elenco atual para busca rápida
    const castIds = new Set(currentCastViewers.map((v) => v.id));

    return searchResults.map((user) => {
      const isInCast = castIds.has(user.id);
      return {
        ...user,
        status: isInCast ? "in_cast" : "new", // 'in_cast' ou 'new'
        isSelected: isInCast ? false : selectedUserIds.has(user.id),
      };
    });
  }, [searchResults, currentCastViewers, selectedUserIds]);

  // 4. Efeito para pré-selecionar usuários novos
  // Quando 'searchResults' muda, pré-seleciona todos que são 'new'.
  useEffect(() => {
    const castIds = new Set(currentCastViewers.map((v) => v.id));
    const newUsers = searchResults
      .filter((user) => !castIds.has(user.id))
      .map((user) => user.id);

    setSelectedUserIds(new Set(newUsers));
  }, [searchResults, currentCastViewers]);

  // 5. Handlers para a UI
  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const clearSearch = () => {
    clearSearchByFeatures();
    setSelectedUserIds(new Set());
  };

  return {
    // Estado da Busca
    processedUsers,
    isLoading: isLoadingSearch,
    error: searchError,
    hasSearched,
    // Ações de Busca
    runSearchByFeatures,
    clearSearch,
    // Estado de Seleção
    selectedUserIds,
    handleToggleUser,
  };
}
