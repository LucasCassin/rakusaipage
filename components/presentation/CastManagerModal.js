import React from "react";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import { FiX, FiUsers } from "react-icons/fi";
import { usePresentationCast } from "src/hooks/usePresentationCast";
import CastUserList from "./CastUserList";
import KPICardSkeleton from "components/ui/KPICardSkeleton";

// --- NOVOS IMPORTS ---
import { useCastSearch } from "src/hooks/useCastSearch";
import CastSearch from "./CastSearch";
// --- FIM DOS NOVOS IMPORTS ---

export default function CastManagerModal({
  presentation,
  permissions,
  onClose,
}) {
  // Hook 1: Gerencia o estado do elenco (Viewers)
  const castHook = usePresentationCast(presentation.id, permissions);
  const {
    viewers,
    isLoading: isLoadingCast,
    error: castError,
    addUserToCast,
    removeUserFromCast,
  } = castHook;

  // --- MUDANÇA: Hook 2: Gerencia o estado da Busca ---
  // Passa os viewers atuais para o hook de busca saber quem filtrar
  const searchHook = useCastSearch(viewers);
  // --- FIM DA MUDANÇA ---

  // Função que o <CastSearch /> vai chamar
  const handleAddMultipleUsers = async (userIds) => {
    // (Poderíamos otimizar isso para um 'Promise.all',
    // mas por enquanto, um loop sequencial é mais seguro para o 'handleApiResponse')
    for (const userId of userIds) {
      await addUserToCast(userId);
    }
    // Após adicionar, limpa a busca
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

          {/* Seção 1: Elenco Atual */}
          <section>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Elenco Atual ({viewers.length})
            </h4>
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

          {/* --- MUDANÇA: Seção 2: Adicionar Membros (UI Real) --- */}
          <section className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Adicionar Membros
            </h4>
            {/* Renderiza a UI de Busca Híbrida */}
            <CastSearch
              castHook={castHook}
              searchHook={searchHook}
              onAddUsers={handleAddMultipleUsers}
            />
          </section>
          {/* --- FIM DA MUDANÇA --- */}
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
