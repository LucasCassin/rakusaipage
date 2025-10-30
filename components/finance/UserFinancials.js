import React, { useState, useEffect } from "react";
import { useAuth } from "src/contexts/AuthContext.js";
import useUrlManager from "src/hooks/useUrlManager";
import { useUserFinancials } from "src/hooks/useUserFinancials";
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext";

import Alert from "components/ui/Alert";
import UserSearchForm from "components/forms/UserSearchForm";
// import SubscriptionDetails from "components/ui/SubscriptionDetails"; // <-- REMOVIDO
import PaymentHistoryList from "components/ui/PaymentHistoryList";
import UserFinancialsSkeleton from "components/ui/UserFinancialsSkeleton";
import Button from "components/ui/Button";

// --- NOVOS IMPORTS ---
import SubscriptionList from "components/finance/SubscriptionList";
import SubscriptionFormModal from "components/finance/SubscriptionFormModal";

export default function UserFinancials({ mode, permissions }) {
  const { user } = useAuth();
  const { updateUrl, getParamValue } = useUrlManager();
  const queryUsername = getParamValue("username");
  const { kpiTrigger } = useFinancialsDashboard();

  const [searchUsername, setSearchUsername] = useState(queryUsername || "");

  const {
    financialData,
    isLoading: isLoadingUserFinancials,
    error: userFinancialsError,
    userFound,
    foundUserId,
    fetchUserFinancials,
    clearSearch,
    availablePlans,
    isLoadingPlans, // <-- Pega o loading dos planos
    isSubModalOpen,
    subModalMode,
    currentSubscription,
    modalError,
    openSubModal,
    closeSubModal,
    createSubscription,
    updateSubscription,
  } = useUserFinancials(user);

  // (useEffect 1 e 2 permanecem iguais)
  useEffect(() => {
    if (queryUsername !== searchUsername) {
      setSearchUsername(queryUsername || "");
    }
  }, [queryUsername]);

  useEffect(() => {
    if (mode === "self" && user && permissions.canViewSelf) {
      fetchUserFinancials(user.username);
    } else if (mode === "other" && queryUsername) {
      fetchUserFinancials(queryUsername);
    } else if (mode === "other" && !queryUsername) {
      clearSearch();
    }
  }, [
    mode,
    queryUsername,
    user,
    permissions,
    kpiTrigger,
    fetchUserFinancials,
    clearSearch,
  ]);

  // (handleSearch e handleUsernameChange permanecem iguais)
  const handleSearch = (usernameToSearch) => {
    updateUrl("username", usernameToSearch);
  };
  const handleUsernameChange = (newUsername) => {
    setSearchUsername(newUsername);
    if (financialData || userFinancialsError) {
      clearSearch();
    }
  };

  // (Verificação de permissão permanece igual)
  if (mode === "self" && !permissions.canViewSelf) {
    return (
      <Alert type="error">Você não tem permissão para ver estes dados.</Alert>
    );
  }
  if (mode === "other" && !permissions.canViewOther) {
    return (
      <Alert type="error">Você não tem permissão para buscar usuários.</Alert>
    );
  }

  // --- RENDER CONTENT ATUALIZADO ---
  const renderContent = () => {
    if (isLoadingUserFinancials) {
      return <UserFinancialsSkeleton />;
    }
    if (userFinancialsError) {
      return <Alert type="error">{userFinancialsError}</Alert>;
    }
    if (userFound) {
      return (
        <>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-md font-semibold text-gray-800">Assinaturas</h4>
            <Button
              size="small"
              variant="primary" // Mudei para 'primary' para destaque
              onClick={() => openSubModal("create")}
              disabled={isLoadingPlans}
            >
              + Adicionar Plano
            </Button>
          </div>
          <div className="space-y-6">
            <SubscriptionList
              subscriptions={financialData.subscriptions}
              onEditClick={(sub) => openSubModal("edit", sub)}
            />
            <PaymentHistoryList payments={financialData.payments} />
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="mt-4">
      {mode === "other" && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <UserSearchForm
            onSearch={handleSearch}
            isLoading={isLoadingUserFinancials}
            username={searchUsername}
            setUsername={handleUsernameChange}
          />
        </div>
      )}

      <div className="mt-4">{renderContent()}</div>

      {/* --- RENDER DO NOVO MODAL --- */}
      {isSubModalOpen && (
        <SubscriptionFormModal
          mode={subModalMode}
          subscription={currentSubscription}
          userId={foundUserId}
          plans={availablePlans}
          error={modalError}
          onClose={closeSubModal}
          onSubmit={
            subModalMode === "create" ? createSubscription : updateSubscription
          }
        />
      )}
    </div>
  );
}
