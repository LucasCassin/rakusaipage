import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";

// O "Cérebro"
import { usePresentationsDashboard } from "src/hooks/usePresentationsDashboard"; //

// Componentes de UI
import PageLayout from "components/layouts/PageLayout";
import InitialLoading from "components/InitialLoading";
import Alert from "components/ui/Alert"; //
import Button from "components/ui/Button"; //
import { FiPlus } from "react-icons/fi";

// Os componentes que acabamos de criar
import PresentationListItem from "components/presentation/PresentationListItem"; //
import PresentationFormModal from "components/presentation/PresentationFormModal"; //
import DeletePresentationModal from "components/presentation/DeletePresentationModal"; //
import PlanListSkeleton from "components/ui/PlanListSkeleton"; // Reutilizando o skeleton

/**
 * Componente de Skeleton para a lista de apresentações
 * (Baseado no seu PlanListSkeleton)
 */
const PresentationListSkeleton = () => (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 divide-y divide-gray-200">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="flex justify-between items-center p-4 animate-pulse"
      >
        <div className="flex-1">
          <div className="h-5 bg-gray-300 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-gray-300 rounded-full"></div>
          <div className="h-8 w-10 bg-gray-300 rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * O "Dashboard" ou "Hub" para gerenciar todas as apresentações.
 *
 */
export default function PresentationsDashboardPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [authError, setAuthError] = useState(null);

  // 1. O "CÉREBRO" (Hook)
  const {
    presentations,
    isLoading,
    error,
    isCreateModalOpen,
    isDeleteModalOpen,
    currentPresentation,
    modalError,
    openCreateModal,
    openDeleteModal,
    closeModal,
    createPresentation,
    deletePresentation,
  } = usePresentationsDashboard(); //

  // 2. A LÓGICA DE PERMISSÃO (baseada em 'financeiro/index.js')
  const permissions = useMemo(() => {
    const features = user?.features || [];
    return {
      // O usuário pode *ver* a página se ele puder ler as apresentações
      canAccessPage: features.includes("read:presentation"),
      // Ele pode *criar* se tiver a "chave" de criação
      canCreate: features.includes("create:presentation"),
      // Ele pode *editar* se tiver a "chave" de atualização
      canUpdate: features.includes("update:presentation"),
      // Ele pode *deletar* se tiver a "chave" de deleção
      canDelete: features.includes("delete:presentation"),
    };
  }, [user]);

  // 3. A GUARDA DE AUTENTICAÇÃO (baseada em 'find-users/index.js')
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      router.push(settings.global.REDIRECTS.LOGIN);
      return;
    }
    // A API já filtra a lista, mas isso impede o acesso à página em si.
    if (!permissions.canAccessPage) {
      setAuthError("Você não tem permissão para acessar esta página.");
      setTimeout(() => router.push(settings.global.REDIRECTS.HOME), 2000);
      return;
    }
    setShowContent(true);
  }, [user, isLoadingAuth, permissions.canAccessPage, router]);

  // Renderização
  if (isLoadingAuth || !showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        {authError ? (
          <Alert type="error">{authError}</Alert>
        ) : (
          <InitialLoading message="Verificando permissões..." />
        )}
      </div>
    );
  }

  return (
    <PageLayout
      title="Apresentações"
      description="Gerencie seus mapas de palco e apresentações."
      maxWidth="max-w-4xl"
    >
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Apresentações
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Crie, edite e gerencie seus mapas de palco.
        </p>
      </div>

      {/* Botão de "Criar" (só aparece se tiver a permissão) */}
      {permissions.canCreate && (
        <div className="mt-8 text-right">
          <Button
            variant="primary" //
            size="small"
            onClick={openCreateModal}
          >
            <FiPlus className="mr-2" />
            Criar Nova Apresentação
          </Button>
        </div>
      )}

      {/* Erro da API (ex: falha ao deletar) */}
      {error && (
        <Alert type="error" className="mt-4">
          {error}
        </Alert>
      )}

      {/* Lista de Apresentações */}
      <div className="mt-6 bg-white rounded-lg shadow-md border border-gray-200 divide-y divide-gray-200">
        {isLoading ? (
          <PresentationListSkeleton />
        ) : presentations.length > 0 ? (
          presentations.map((pres) => (
            <PresentationListItem
              key={pres.id}
              presentation={pres}
              // Passa as permissões para o item
              permissions={{
                canUpdate: permissions.canUpdate,
                canDelete: permissions.canDelete,
              }}
              onDeleteClick={() => openDeleteModal(pres)}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 p-8">
            Nenhuma apresentação encontrada.
          </p>
        )}
      </div>

      {/* --- Renderização dos Modais --- */}
      {isCreateModalOpen && (
        <PresentationFormModal
          error={modalError}
          onClose={closeModal}
          onSubmit={createPresentation}
        />
      )}

      {isDeleteModalOpen && (
        <DeletePresentationModal
          presentation={currentPresentation}
          error={modalError}
          onClose={closeModal}
          onDelete={deletePresentation}
        />
      )}
    </PageLayout>
  );
}
