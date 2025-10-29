import React, { useState, useEffect } from "react";
import { useAuth } from "src/contexts/AuthContext.js";
import useUrlManager from "src/hooks/useUrlManager";
import { useUserFinancials } from "src/hooks/useUserFinancials";
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext";

import Alert from "components/ui/Alert";
import UserSearchForm from "components/forms/UserSearchForm";
import SubscriptionDetails from "components/ui/SubscriptionDetails";
import PaymentHistoryList from "components/ui/PaymentHistoryList";
import UserFinancialsSkeleton from "components/ui/UserFinancialsSkeleton";

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
    fetchUserFinancials,
    clearSearch,
  } = useUserFinancials();

  // Efeito 1: Sincroniza a URL com o estado do input.
  // (Para bookmarks, botão "Voltar", etc.)
  useEffect(() => {
    // Se a URL mudar, atualiza o campo de input
    if (queryUsername !== searchUsername) {
      setSearchUsername(queryUsername || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryUsername]);

  // Efeito 2: Busca os dados QUANDO a URL ou o gatilho mudarem.
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

  // Handler para o onSearch (clique no botão ou Enter)
  const handleSearch = (usernameToSearch) => {
    // ESTA é a única função que deve atualizar a URL
    updateUrl("username", usernameToSearch);
  };

  // Handler para o onChange (digitação no input)
  const handleUsernameChange = (newUsername) => {
    // 1. Apenas atualiza o estado local do input
    setSearchUsername(newUsername);

    // 2. Limpa os resultados anteriores (para não mostrar "alunoA"
    //    enquanto digita "alunoAB")
    if (financialData) {
      clearSearch();
    }

    // 3. A LINHA DO BUG FOI REMOVIDA
    // if (queryUsername) { updateUrl("username", ""); } // <-- REMOVIDO
  };

  // --- O RESTO DO COMPONENTE ---
  // (Permanece idêntico)

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

      <div className="mt-4">
        {isLoadingUserFinancials ? (
          <UserFinancialsSkeleton />
        ) : userFinancialsError ? (
          <Alert type="error">{userFinancialsError}</Alert>
        ) : userFound ? (
          <div className="space-y-6">
            <SubscriptionDetails subscription={financialData.subscription} />
            <PaymentHistoryList payments={financialData.payments} />
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}
