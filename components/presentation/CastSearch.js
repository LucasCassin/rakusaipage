import React from "react";
import FeatureSelectionForm from "components/forms/FeatureSelectionForm"; //
import UserListSkeleton from "components/ui/UserListSkeleton"; //
import Alert from "components/ui/Alert";
import Button from "components/ui/Button";
import Switch from "components/ui/Switch"; //
import { FiPlus, FiUserPlus } from "react-icons/fi";

/**
 * Renderiza um item na lista de resultados da busca de elenco.
 * Inclui o checkbox e o status "Já é membro".
 *
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
 * A UI completa para a "Busca Híbrida"
 */
export default function CastSearch({ castHook, searchHook, onAddUsers }) {
  const { addUserToCast } = castHook; // (Não usado aqui, mas no modal)
  const {
    processedUsers,
    isLoading,
    error,
    hasSearched,
    runSearchByFeatures,
    clearSearch,
    selectedUserIds,
    handleToggleUser,
  } = searchHook;

  const [isAdding, setIsAdding] = useState(false);

  const handleAddClick = async () => {
    setIsAdding(true);
    // (O 'onAddUsers' virá do 'CastManagerModal')
    await onAddUsers(Array.from(selectedUserIds));
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Busca Individual (Placeholder, como no UserFinancials) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Busca por Nome
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Digite o username..."
            className="flex-1 w-full rounded-md border border-gray-300 text-sm"
            disabled // (Implementar 'useUserSearch' aqui depois)
          />
          <Button variant="secondary" disabled>
            <FiUserPlus />
          </Button>
        </div>
      </div>

      {/* 2. Busca por Grupo (Baseado no find-users.js) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Busca por Grupo (Features)
        </label>
        <FeatureSelectionForm
          onSearch={runSearchByFeatures}
          isLoading={isLoading}
          onParamsChange={clearSearch}
          // (initialFeatures não é necessário no modal)
        />
      </div>

      {/* 3. Resultados */}
      {error && <Alert type="error">{error}</Alert>}
      {isLoading && <UserListSkeleton />}
      {!isLoading && hasSearched && (
        <>
          {processedUsers.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-track-transparent pr-1">
              {processedUsers.map((user) => (
                <SearchResultItem
                  key={user.id}
                  user={user}
                  onToggle={handleToggleUser}
                  disabled={isLoading}
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
                onClick={handleAddClick}
                isLoading={isAdding}
                disabled={isAdding}
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
