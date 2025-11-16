import React, { useState, useMemo } from "react";
import { FiX, FiSearch, FiUserPlus } from "react-icons/fi";
import { useAuth } from "src/contexts/AuthContext";
import UserAvatar from "components/ui/UserAvatar";
import Alert from "components/ui/Alert";
import Button from "components/ui/Button";

/**
 * Componente para exibir um usuário selecionado com um botão de remoção.
 */
function SelectedAssignee({ user, onRemove }) {
  return (
    <div className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
      <div className="flex items-center gap-2">
        <UserAvatar username={user.username} size="sm" />
        <span className="text-sm font-medium text-gray-800">
          {user.username}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(user.id)}
        className="text-gray-500 hover:text-red-600"
        title="Remover"
      >
        <FiX className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Gerenciador de seleção de múltiplos usuários (Assignees)
 * a partir de um elenco (cast) existente.
 */
export default function AssigneeManager({
  cast, // { viewers: [], isLoading: ... }
  currentAssignees, // Array de IDs [uuid, uuid]
  onChange, // fn(newAssignees)
  maxLimit,
}) {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  // Deriva a lista de *objetos* de usuário dos IDs
  const selectedUsers = useMemo(() => {
    const castViewers = cast.viewers || [];
    const assigneeSet = new Set(currentAssignees || []);
    return castViewers.filter((user) => assigneeSet.has(user.id));
  }, [currentAssignees, cast.viewers]);

  // Filtra o elenco disponível para adicionar
  const availableUsers = useMemo(() => {
    const castViewers = cast.viewers || [];
    const assigneeSet = new Set(currentAssignees || []);

    const filtered = castViewers.filter((user) => {
      // 1. Não pode já estar selecionado
      if (assigneeSet.has(user.id)) return false;
      // 2. Se não houver busca, não mostra ninguém
      if (searchTerm.trim() === "") return false;
      // 3. Corresponder ao termo de busca
      return user.username.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return filtered;
  }, [currentAssignees, cast.viewers, searchTerm]);

  const atLimit = selectedUsers.length >= maxLimit;

  const handleSelectUser = (user) => {
    if (atLimit) {
      setError(`Limite de ${maxLimit} usuários atingido.`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    // O 'Set' garante que não haja duplicatas
    const newAssigneeSet = new Set(currentAssignees);
    newAssigneeSet.add(user.id);

    onChange(Array.from(newAssigneeSet));
    setSearchTerm(""); // Limpa a busca
    setError(null);
  };

  const handleRemoveUser = (userId) => {
    const newAssignees = currentAssignees.filter((id) => id !== userId);
    onChange(newAssignees);
    setError(null);
  };

  // Adiciona o próprio usuário logado rapidamente
  const addSelf = () => {
    if (currentUser && !currentAssignees.includes(currentUser.id)) {
      handleSelectUser(currentUser);
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Alerta de Limite/Erro */}
      {error && <Alert type="error">{error}</Alert>}
      {atLimit && !error && (
        <Alert type="info">Limite de {maxLimit} usuário(s) atingido.</Alert>
      )}

      {/* 2. Lista de Usuários Selecionados */}
      {selectedUsers.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-track-transparent pr-1">
          {selectedUsers.map((user) => (
            <SelectedAssignee
              key={user.id}
              user={user}
              onRemove={handleRemoveUser}
            />
          ))}
        </div>
      )}

      {/* 3. Input de Busca */}
      {!atLimit && (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar no elenco..."
            className="block w-full rounded-md border-gray-300 pl-10 shadow-sm sm:text-sm"
            disabled={cast.isLoading}
          />
        </div>
      )}

      {/* 4. Resultados da Busca */}
      {searchTerm && availableUsers.length > 0 && (
        <div className="space-y-2 rounded-md border border-gray-200 bg-white p-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-track-transparent">
          {availableUsers.map((user) => (
            <button
              type="button"
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-gray-100"
            >
              <UserAvatar username={user.username} size="sm" />
              <span className="text-sm font-medium text-gray-800">
                {user.username}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 5. Botão "Adicionar Eu" (se não estiver no limite e nem já adicionado) */}
      {currentUser &&
        !atLimit &&
        !currentAssignees.includes(currentUser.id) && (
          <Button
            type="button"
            variant="secondary"
            onClick={addSelf}
            size="small"
            className="w-full"
          >
            <FiUserPlus className="mr-2" />
            Adicionar-me
          </Button>
        )}
    </div>
  );
}
