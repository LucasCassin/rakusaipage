import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "src/contexts/AuthContext.js";
import useUrlManager from "src/hooks/useUrlManager";
import { useUserFinancials } from "src/hooks/useUserFinancials";
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext";

import Alert from "components/ui/Alert";
import UserSearchForm from "components/forms/UserSearchForm";
import SubscriptionDetails from "components/ui/SubscriptionDetails";
import PaymentHistoryList from "components/ui/PaymentHistoryList";
import UserFinancialsSkeleton from "components/ui/UserFinancialsSkeleton";

/**
 * Componente para exibir dados financeiros de um usuário.
 * Pode operar em modo "self" (buscando dados do usuário logado)
 * ou "other" (exibindo um formulário de busca para admins).
 */
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

  // Efeito principal que dispara a busca de dados
  useEffect(() => {
    // Se for 'self', busca os dados do usuário logado
    if (mode === "self" && user && permissions.canViewSelf) {
      fetchUserFinancials(user.username);
    }
    // Se for 'other' e tiver um username na URL, busca esse usuário
    else if (mode === "other" && queryUsername) {
      if (searchUsername !== queryUsername) {
        setSearchUsername(queryUsername);
      }
      fetchUserFinancials(queryUsername);
    }
    // Se for 'other' mas sem query, limpa
    else if (mode === "other" && !queryUsername) {
      clearSearch();
    }
  }, [
    mode,
    queryUsername,
    user,
    permissions,
    fetchUserFinancials,
    clearSearch,
    searchUsername,
    kpiTrigger,
  ]);

  // Handler para o onSearch do formulário
  const handleSearch = (usernameToSearch) => {
    updateUrl("username", usernameToSearch); // Atualiza a URL, que dispara o useEffect
  };

  // Handler para o onChange do input (nova exigência)
  const handleUsernameChange = (newUsername) => {
    setSearchUsername(newUsername);
    // Se o usuário está digitando, limpa os resultados
    // e o parâmetro da URL para um novo "estado de busca"
    if (financialData) {
      clearSearch();
    }
    if (queryUsername) {
      updateUrl("username", "");
    }
  };

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
            setUsername={handleUsernameChange} // Usando o novo handler
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
          mode === "other" &&
          queryUsername &&
          !isLoadingUserFinancials && (
            <p className="text-center text-gray-500 py-8">
              Nenhum resultado encontrado para "{queryUsername}".
            </p>
          )
        )}
      </div>
    </div>
  );
}
