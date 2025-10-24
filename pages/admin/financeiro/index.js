import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";
import useUrlManager from "src/hooks/useUrlManager";

import PageLayout from "components/layouts/PageLayout";
import Alert from "components/ui/Alert";
import InitialLoading from "components/InitialLoading";
import KPICard from "components/ui/KPICard";
import KPICardSkeleton from "components/ui/KPICardSkeleton";
import PaymentManagementTabs from "components/ui/PaymentManagementTabs";
import PaymentListItem from "components/ui/PaymentListItem";
import PaymentListSkeleton from "components/ui/PaymentListSkeleton";
import SwitchMode from "components/forms/SwitchMode";
import UserSearchForm from "components/forms/UserSearchForm"; // MUDANÇA: Usando o novo formulário de busca
import SubscriptionDetails from "components/ui/SubscriptionDetails";
import PaymentHistoryList from "components/ui/PaymentHistoryList";
import UserFinancialsSkeleton from "components/ui/UserFinancialsSkeleton";

import { useFinancialDashboard } from "src/hooks/useFinancialDashboard";
import { useUserFinancials } from "src/hooks/useUserFinancials";
import { FiUsers, FiDollarSign, FiClock, FiCheckSquare } from "react-icons/fi";

// Definição de permissões por seção
const PERMISSIONS_KPI_SECTION = [
  "read:payment:other",
  "read:subscription:other",
];
const PERMISSIONS_PAYMENT_MANAGEMENT = [
  "read:payment:other",
  "update:payment:confirm_paid",
];
const PERMISSIONS_USER_FINANCIALS_SELF = [
  "read:subscription:self",
  "read:payment:self",
];
const PERMISSIONS_USER_FINANCIALS_OTHER = [
  "read:subscription:other",
  "read:user:other",
];

export default function FinancialDashboardPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [mode, setMode] = useState("self");
  const [searchUsername, setSearchUsername] = useState("");

  const { updateUrl, getParamValue } = useUrlManager();
  const queryUsername = getParamValue("username");
  const router = useRouter();

  const userPermissions = useMemo(() => {
    const userFeatures = user?.features || [];
    const hasPermission = (requiredFeatures) =>
      requiredFeatures.some((feature) => userFeatures.includes(feature));

    const canViewKPIs = hasPermission(PERMISSIONS_KPI_SECTION);
    const canViewPaymentManagement = hasPermission(
      PERMISSIONS_PAYMENT_MANAGEMENT,
    );
    const canViewSelf = hasPermission(PERMISSIONS_USER_FINANCIALS_SELF);
    const canViewOther = hasPermission(PERMISSIONS_USER_FINANCIALS_OTHER);

    return {
      canViewKPIs,
      canViewPaymentManagement,
      canViewSelf,
      canViewOther,
      canAccessPage:
        canViewKPIs || canViewPaymentManagement || canViewSelf || canViewOther,
    };
  }, [user]);

  const {
    kpiData,
    payments,
    activeTab,
    setActiveTab,
    isLoading: isLoadingDashboard,
    error: dashboardError,
  } = useFinancialDashboard(
    user,
    userPermissions.canViewKPIs || userPermissions.canViewPaymentManagement,
  );

  const {
    financialData,
    isLoading: isLoadingUserFinancials,
    error: userFinancialsError,
    userFound,
    fetchUserFinancials,
    clearSearch,
  } = useUserFinancials();

  // Efeito de guarda e definição de modo inicial
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      setAuthError("Você precisa estar autenticado para acessar esta página.");
      setTimeout(() => router.push(settings.global.REDIRECTS.LOGIN), 2000);
      return;
    }
    if (!userPermissions.canAccessPage) {
      setAuthError(
        "Você não tem permissão para acessar o dashboard financeiro.",
      );
      setTimeout(() => router.push(settings.global.REDIRECTS.HOME), 2000);
      return;
    }

    // MUDANÇA: Se o usuário pode ver outros, o padrão é o modo 'other'. Senão, 'self'.
    // const initialMode = userPermissions.canViewOther ? "other" : "self";
    // console.log("set Mode linha 116");
    // setMode(initialMode);
    setShowContent(true);
  }, [
    user,
    isLoadingAuth,
    userPermissions.canAccessPage,
    userPermissions.canViewOther,
    router,
  ]);

  // Efeito para buscar dados com base na URL ou no modo
  useEffect(() => {
    if (!showContent) return;
    if (mode === "self" && user) {
      fetchUserFinancials(user.username);
      if (queryUsername) updateUrl("username", ""); // Limpa a URL se o usuário mudar para 'self'
    } else if (mode === "other" && queryUsername) {
      setSearchUsername(queryUsername);
      fetchUserFinancials(queryUsername);
    } else {
      clearSearch();
    }
  }, [
    mode,
    queryUsername,
    showContent,
    user,
    // fetchUserFinancials,
    // clearSearch,
    // updateUrl,
  ]);

  const handleModeChange = useCallback(
    (newMode) => {
      console.log(newMode);

      clearSearch();
      setSearchUsername("");
      updateUrl("username", "");
      console.log("set mode linha 156");
      setMode(newMode);
      console.log(mode);
    },
    [clearSearch, updateUrl],
  );

  const handleSearch = (usernameToSearch) => {
    setSearchUsername(usernameToSearch); // Atualiza o estado local para o input
    updateUrl("username", usernameToSearch); // Atualiza a URL, que dispara o useEffect
  };

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    switch (activeTab) {
      case "awaiting_confirmation":
        return payments.filter(
          (p) => p.user_notified_payment && p.status === "PENDING",
        );
      case "pending_overdue":
        return payments.filter(
          (p) => p.status === "PENDING" || p.status === "OVERDUE",
        );
      case "history":
        return payments;
      default:
        return [];
    }
  }, [activeTab, payments]);

  if (isLoadingAuth || !showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <InitialLoading message="Verificando permissões..." />
      </div>
    );
  }

  return (
    <PageLayout
      title="Dashboard Financeiro"
      description="Acompanhamento de pagamentos"
      maxWidth="max-w-7xl"
    >
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Dashboard Financeiro
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Visão geral da saúde financeira e gestão de pagamentos.
        </p>
      </div>

      {userPermissions.canViewKPIs && (
        <div className="mt-8">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Visão Geral
          </h3>
          {dashboardError && <Alert type="error">{dashboardError}</Alert>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingDashboard ? (
              <>
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
              </>
            ) : (
              <>
                <KPICard
                  title="Alunos Ativos"
                  value={kpiData.activeStudents}
                  icon={FiUsers}
                  color="blue"
                />
                <KPICard
                  title="Receita do Mês"
                  value={kpiData.revenueThisMonth}
                  icon={FiDollarSign}
                  color="green"
                />
                <KPICard
                  title="Pendente no Mês"
                  value={kpiData.pendingThisMonth}
                  icon={FiClock}
                  color="yellow"
                />
                <KPICard
                  title="Aguardando Confirmação"
                  value={kpiData.awaitingConfirmation}
                  icon={FiCheckSquare}
                  color="purple"
                />
              </>
            )}
          </div>
        </div>
      )}

      {userPermissions.canViewPaymentManagement && (
        <div className="mt-12">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Gestão de Pagamentos
          </h3>
          <PaymentManagementTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          <div className="mt-6 space-y-4">
            {isLoadingDashboard ? (
              <PaymentListSkeleton />
            ) : filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <PaymentListItem key={payment.id} payment={payment} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                Nenhum pagamento encontrado para esta categoria.
              </p>
            )}
          </div>
        </div>
      )}

      {/* --- MUDANÇA: Seção de Consulta Financeira totalmente implementada --- */}
      {(userPermissions.canViewSelf || userPermissions.canViewOther) && (
        <div className="mt-12">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Consulta Financeira
          </h3>

          {userPermissions.canViewSelf && userPermissions.canViewOther && (
            <div className="mb-6 flex justify-center">
              <SwitchMode
                canUpdateSelf={userPermissions.canViewSelf}
                updateMode={mode}
                handleUpdateModeChange={handleModeChange}
                textSelf="Meus Dados"
                textOther="Dados dos Alunos"
                disabled={isLoadingUserFinancials}
              />
            </div>
          )}

          {mode === "other" && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <UserSearchForm
                onSearch={handleSearch}
                isLoading={isLoadingUserFinancials}
                username={searchUsername}
                setUsername={setSearchUsername}
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
                <SubscriptionDetails
                  subscription={financialData.subscription}
                />
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
      )}
    </PageLayout>
  );
}
