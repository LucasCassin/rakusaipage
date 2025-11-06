import React, { useState, useMemo } from "react";
import FeatureSelectionForm from "components/forms/FeatureSelectionForm";
import UserListSkeleton from "components/ui/UserListSkeleton";
import Alert from "components/ui/Alert";
import Button from "components/ui/Button";
import Switch from "components/ui/Switch";
import { FiPlus, FiUserPlus, FiCheck } from "react-icons/fi";

const STABLE_EMPTY_ARRAY = [];

/**
 * Renderiza um item na lista de resultados da busca de elenco (Bulk).
 */
const SearchResultItem = ({ user, onToggle, disabled }) => (
  <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
    <span className="font-semibold text-gray-800">{user.username}</span>
    {user.status === "in_cast" ? (
      <span className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-gray-200 rounded-full">
        Já é membro
      </span>
    ) : (
      <Switch
        checked={user.isSelected}
        onChange={() => onToggle(user.id)}
        disabled={disabled}
      />
    )}
  </div>
);

/**
 * Renderiza o resultado da busca INDIVIDUAL.
 */
const SingleSearchResult = ({ user, currentCastIds, onAdd, isAdding }) => {
  const isInCast = currentCastIds.has(user.id);

  return (
    <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-300 shadow-sm mt-3">
      <span className="font-semibold text-gray-800">{user.username}</span>
      {isInCast ? (
        <span className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-gray-200 rounded-full">
          Já é membro
        </span>
      ) : (
        <Button
          variant="primary"
          size="small"
          onClick={() => onAdd(user.id)}
          isLoading={isAdding}
          disabled={isAdding}
        >
          <FiPlus />
        </Button>
      )}
    </div>
  );
};

/**
 * A UI completa para a "Busca Híbrida"
 */
export default function CastSearch({ castHook, searchHook, onAddUsers }) {
  // Pega o hook de 'cast' para checar o elenco atual
  const { viewers, addUserToCast } = castHook;

  // Pega TODOS os novos estados e funções do 'searchHook'
  const {
    // Bulk
    processedUsers,
    isLoadingSearch,
    searchError: bulkSearchError,
    hasSearched,
    runSearchByFeatures,
    clearSearch,
    selectedUserIds,
    handleToggleUser,
    // Single
    searchTerm,
    setSearchTerm,
    isLoadingIndividual,
    individualSearchResult,
    individualSearchError,
    runSearchByUsername,
  } = searchHook;

  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [isAddingSingle, setIsAddingSingle] = useState(false);

  // Mapeia os IDs do elenco atual para o <SingleSearchResult>
  const currentCastIds = useMemo(
    () => new Set(viewers.map((v) => v.id)),
    [viewers],
  );

  // Handler para o botão "Adicionar" (Bulk)
  const handleAddBulkClick = async () => {
    setIsAddingBulk(true);
    await onAddUsers(Array.from(selectedUserIds));
    setIsAddingBulk(false);
  };

  // Handler para o botão "+" (Single)
  const handleAddSingleClick = async (userId) => {
    setIsAddingSingle(true);
    await addUserToCast(userId);
    // Limpa a busca individual após adicionar
    searchHook.clearSearch();
    setIsAddingSingle(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    runSearchByUsername(searchTerm);
  };

  return (
    <div className="space-y-6">
      {/* 1. Busca Individual (AGORA ATIVA) */}
      <div>
        <label
          htmlFor="user-search"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Busca por Nome
        </label>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            id="user-search"
            type="text"
            placeholder="Digite o username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 w-full rounded-md border border-gray-300 text-sm"
            disabled={isLoadingIndividual}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={isLoadingIndividual || !searchTerm}
            isLoading={isLoadingIndividual}
          >
            <FiUserPlus />
          </Button>
        </form>
        {/* Renderiza o Erro ou o Resultado da busca individual */}
        {individualSearchError && (
          <Alert type="error" className="mt-2">
            {individualSearchError}
          </Alert>
        )}
        {individualSearchResult && (
          <SingleSearchResult
            user={individualSearchResult}
            currentCastIds={currentCastIds}
            onAdd={handleAddSingleClick}
            isAdding={isAddingSingle}
          />
        )}
      </div>

      {/* 2. Busca por Grupo */}
      <div className="border-t pt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Busca por Grupo (Features)
        </label>
        <FeatureSelectionForm
          onSearch={runSearchByFeatures}
          isLoading={isLoadingSearch}
          onParamsChange={clearSearch}
          initialFeatures={STABLE_EMPTY_ARRAY}
        />
      </div>

      {/* 3. Resultados (Bulk) */}
      {bulkSearchError && <Alert type="error">{bulkSearchError}</Alert>}
      {isLoadingSearch && <UserListSkeleton />}
      {!isLoadingSearch && hasSearched && (
        <>
          {processedUsers.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-track-transparent pr-1">
              {processedUsers.map((user) => (
                <SearchResultItem
                  key={user.id}
                  user={user}
                  onToggle={handleToggleUser}
                  disabled={isLoadingSearch}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhum usuário encontrado.
            </p>
          )}

          {selectedUserIds.size > 0 && (
            <div className="border-t pt-4 flex justify-end">
              <Button
                variant="primary"
                onClick={handleAddBulkClick}
                isLoading={isAddingBulk}
                disabled={isAddingBulk}
              >
                <FiPlus className="mr-2" />
                Adicionar {selectedUserIds.size} Membro(s)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
