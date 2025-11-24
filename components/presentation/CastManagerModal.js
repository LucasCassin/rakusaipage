import React, { useEffect } from "react";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import { FiX, FiUsers } from "react-icons/fi";
import CastUserList from "./CastUserList";
import KPICardSkeleton from "components/ui/KPICardSkeleton";
import { useCastSearch } from "src/hooks/useCastSearch";
import CastSearch from "./CastSearch";

/**
 * Modal para gerenciar o Elenco (presentation_viewers).
 */
export default function CastManagerModal({ presentation, onClose, castHook }) {
  const {
    viewers = [],
    isLoading: isLoadingCast = true,
    error: castError,
    addUserToCast,
    removeUserFromCast,
    fetchViewers,
  } = castHook || {};

  useEffect(() => {
    if (fetchViewers) {
      fetchViewers();
    }
  }, []);

  const searchHook = useCastSearch(viewers);

  const handleAddMultipleUsers = async (userIds) => {
    if (!addUserToCast) return;
    for (const userId of userIds) {
      await addUserToCast(userId);
    }
    searchHook.clearSearch();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FiUsers /> Gerenciar Elenco
          </h3>
          <button onClick={onClose}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo (com scroll interno) */}
        <div className="p-6 overflow-y-auto space-y-8">
          {castError && <Alert type="error">{castError}</Alert>}

          <section>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Elenco Atual ({viewers.length})
            </h4>
            {/* 3. O 'isLoadingCast' agora será atualizado pelo 'fetchViewers' */}
            {isLoadingCast ? (
              <KPICardSkeleton />
            ) : (
              <CastUserList
                viewers={viewers}
                scenes={presentation.scenes}
                onRemove={removeUserFromCast}
              />
            )}
          </section>

          <section className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Adicionar Membros
            </h4>
            <CastSearch
              castHook={castHook}
              searchHook={searchHook}
              onAddUsers={handleAddMultipleUsers}
            />
          </section>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
