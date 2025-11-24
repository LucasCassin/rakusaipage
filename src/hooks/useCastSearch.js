import { useState, useEffect, useMemo, useCallback } from "react";
import { useUserSearchByFeatures } from "./useUserSearchByFeatures";
import { useUserSearch } from "./useUserSearch";
import { useMessage } from "./useMessage";
import { useSetFieldError } from "./useSetFieldError";

/**
 * Hook para gerenciar a "Busca Híbrida" para o elenco.
 * AGORA gerencia 'useUserSearchByFeatures' E 'useUserSearch'.
 */
export function useCastSearch(currentCastViewers = []) {
  const {
    users: searchResults,
    isLoading: isLoadingSearch,
    error: searchError,
    hasSearched,
    searchUsers: runSearchByFeatures,
    clearSearch: clearSearchByFeatures,
  } = useUserSearchByFeatures();

  const [searchTerm, setSearchTerm] = useState("");
  const [individualSearchResult, setIndividualSearchResult] = useState(null);

  const individualMessage = useMessage();
  const individualFieldErrors = useSetFieldError();

  const {
    isLoading: isLoadingIndividual,
    userFound: individualUserFound,
    setUserFound: setIndividualUserFound,
    fetchUserData: runSearchByUsername,
  } = useUserSearch({
    messageHandlers: individualMessage,
    setFieldErrorsHandlers: individualFieldErrors,
    onSuccessCallback: (user) => {
      setIndividualSearchResult(user);
    },
    resetCallback: () => {
      setIndividualSearchResult(null);
    },
  });

  const [selectedUserIds, setSelectedUserIds] = useState(new Set());

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

  useEffect(() => {
    const castIds = new Set(currentCastViewers.map((v) => v.id));
    const newUsers = searchResults
      .filter((user) => !castIds.has(user.id))
      .map((user) => user.id);
    setSelectedUserIds(new Set(newUsers));
  }, [searchResults, currentCastViewers]);

  const handleToggleUser = useCallback((userId) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) newSet.delete(userId);
      else newSet.add(userId);
      return newSet;
    });
  }, []);

  const clearSearch = useCallback(() => {
    clearSearchByFeatures();
    setSelectedUserIds(new Set());

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
    processedUsers,
    isLoadingSearch,
    searchError,
    hasSearched,
    runSearchByFeatures,

    searchTerm,
    setSearchTerm,
    isLoadingIndividual,
    individualSearchResult,
    individualSearchError:
      individualMessage.error || individualFieldErrors.fieldErrors?.username,
    runSearchByUsername,

    clearSearch,
    selectedUserIds,
    handleToggleUser,
  };
}
