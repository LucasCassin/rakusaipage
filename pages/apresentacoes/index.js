import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";

import { usePresentationsDashboard } from "src/hooks/usePresentationsDashboard";

import PageLayout from "components/layouts/PageLayout";
import InitialLoading from "components/InitialLoading";
import Alert from "components/ui/Alert";
import Button from "components/ui/Button";
import { FiPlus } from "react-icons/fi";

import PresentationListItem from "components/presentation/PresentationListItem";
import PresentationFormModal from "components/presentation/PresentationFormModal";
import DeletePresentationModal from "components/presentation/DeletePresentationModal";

/**
 * Componente de Skeleton para a lista de apresentações
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
 */
export default function PresentationsDashboardPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [authError, setAuthError] = useState(null);

  const {
    presentations,
    isLoading,
    error,
    isCreateModalOpen,
    isDeleteModalOpen,
    currentPresentation,
    presentationToEdit,
    modalError,
    openCreateModal,
    openEditModal,
    openDeleteModal,
    closeModal,
    createPresentation,
    updatePresentation,
    deletePresentation,
  } = usePresentationsDashboard();

  const permissions = useMemo(() => {
    const features = user?.features || [];
    return {
      canAccessPage: features.includes("read:presentation"),
      canCreate: features.includes("create:presentation"),
      canUpdate: features.includes("update:presentation"),
      canDelete: features.includes("delete:presentation"),
    };
  }, [user]);

  const sortedPresentations = useMemo(() => {
    if (!presentations) return [];

    const now = new Date(); // Data atual (momento absoluto)

    // Separa as apresentações
    const future = [];
    const past = [];
    const noDate = [];

    presentations.forEach((p) => {
      if (!p.date) {
        noDate.push(p);
        return;
      }

      const pDate = new Date(p.date);
      // Compara timestamp absoluto para verificar se já passou
      if (pDate < now) {
        past.push(p);
      } else {
        future.push(p);
      }
    });

    // 1. Futuras: Ascendente (mais próxima do hoje -> mais longe)
    future.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 2. Passadas: Descendente (mais recente -> mais antiga)
    past.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Constrói a lista final: Futuras -> Sem Data -> Passadas
    return [...future, ...noDate, ...past];
  }, [presentations]);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      router.push(settings.global.REDIRECTS.LOGIN);
      return;
    }
    if (!permissions.canAccessPage) {
      setAuthError("Você não tem permissão para acessar esta página.");
      setTimeout(() => router.push(settings.global.REDIRECTS.HOME), 2000);
      return;
    }
    setShowContent(true);
  }, [user, isLoadingAuth, permissions.canAccessPage, router]);

  const handleFormSubmit = async (formData) => {
    if (presentationToEdit) {
      await updatePresentation(presentationToEdit.id, formData);
    } else {
      await createPresentation(formData);
    }
  };

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
    <>
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

        {permissions.canCreate && (
          <div className="mt-8 text-right">
            <Button variant="primary" size="small" onClick={openCreateModal}>
              <FiPlus className="mr-2" />
              Criar Nova Apresentação
            </Button>
          </div>
        )}

        {error && (
          <Alert type="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="mt-6 bg-white rounded-lg shadow-md border border-gray-200 divide-y divide-gray-200">
          {isLoading ? (
            <PresentationListSkeleton />
          ) : sortedPresentations.length > 0 ? (
            sortedPresentations.map((pres, index) => {
              // Lógica de Passado
              const isPast = pres.date && new Date(pres.date) < new Date();

              // Lógica de Posição para Arredondamento
              const isFirst = index === 0;
              const isLast = index === sortedPresentations.length - 1;

              return (
                <PresentationListItem
                  key={pres.id}
                  presentation={pres}
                  isPast={isPast}
                  isFirst={isFirst} // Passa se é o primeiro
                  isLast={isLast} // Passa se é o último
                  permissions={{
                    canUpdate: permissions.canUpdate,
                    canDelete: permissions.canDelete,
                  }}
                  onDeleteClick={() => openDeleteModal(pres)}
                  onEditInfoClick={() => openEditModal(pres)}
                />
              );
            })
          ) : (
            <p className="text-center text-gray-500 p-8">
              Nenhuma apresentação encontrada.
            </p>
          )}
        </div>
      </PageLayout>

      {isCreateModalOpen && (
        <PresentationFormModal
          error={modalError}
          onClose={closeModal}
          onSubmit={handleFormSubmit}
          presentationToEdit={presentationToEdit}
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
    </>
  );
}
