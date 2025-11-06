import React from "react";
import Button from "components/ui/Button"; //
import Alert from "components/ui/Alert"; //
import { FiX, FiUsers } from "react-icons/fi";
import { usePresentationCast } from "src/hooks/usePresentationCast"; //
import CastUserList from "./CastUserList";
import KPICardSkeleton from "components/ui/KPICardSkeleton"; //

/**
 * Modal para gerenciar o Elenco (presentation_viewers).
 *
 */
export default function CastManagerModal({
  presentation,
  permissions,
  onClose,
  castHook, // <-- 1. RECEBE O HOOK COMO PROP
}) {
  const {
    viewers,
    isLoading,
    error,
    addUserToCast, // (Usaremos no próximo passo)
    removeUserFromCast,
  } = castHook; // <-- 2. USA O HOOK RECEBIDO

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
          {error && <Alert type="error">{error}</Alert>}

          {/* Seção 1: Elenco Atual */}
          <section>
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Elenco Atual ({viewers.length})
            </h4>
            {isLoading ? (
              <KPICardSkeleton />
            ) : (
              <CastUserList
                viewers={viewers}
                scenes={presentation.scenes} // Passa as cenas para o contador
                onRemove={removeUserFromCast}
              />
            )}
          </section>

          {/* Seção 2: Adicionar Membros (Placeholder) */}
          <section className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">
              Adicionar Membros
            </h4>
            <div className="p-8 bg-gray-100 rounded-lg text-center">
              Placeholder para a "Busca Híbrida"
            </div>
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
