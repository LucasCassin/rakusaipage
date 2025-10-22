import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";
import { texts } from "src/utils/texts.js";

import PageLayout from "components/layouts/PageLayout";
import Alert from "components/ui/Alert";
import InitialLoading from "components/InitialLoading";
import KPICard from "components/ui/KPICard";
import KPICardSkeleton from "components/ui/KPICardSkeleton";
import { useFinancialDashboard } from "src/hooks/useFinancialDashboard";
import PaymentManagementTabs from "components/ui/PaymentManagementTabs";
import PaymentListItem from "components/ui/PaymentListItem";
import PaymentListSkeleton from "components/ui/PaymentListSkeleton";
import { FiUsers, FiDollarSign, FiClock, FiCheckSquare } from "react-icons/fi";

// MUDANÇA: Definição de permissões para cada seção
const PERMISSIONS_KPI_SECTION = [
  "read:payment:other",
  "read:subscription:other",
];
const PERMISSIONS_PAYMENT_MANAGEMENT = [
  "read:payment:other",
  "update:payment:confirm_paid",
];

export default function FinancialDashboardPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [authError, setAuthError] = useState(null);

  // MUDANÇA: Lógica de permissões agora considera ambas as seções
  const userPermissions = useMemo(() => {
    const userFeatures = user?.features || [];
    const hasPermission = (requiredFeatures) =>
      requiredFeatures.some((feature) => userFeatures.includes(feature));

    const canViewKPIs = hasPermission(PERMISSIONS_KPI_SECTION);
    const canViewPaymentManagement = hasPermission(
      PERMISSIONS_PAYMENT_MANAGEMENT,
    );

    return {
      canViewKPIs,
      canViewPaymentManagement,
      canAccessPage: canViewKPIs || canViewPaymentManagement, // Acesso liberado se puder ver pelo menos uma seção
    };
  }, [user]);

  // MUDANÇA: Puxa todos os dados e setters necessários do hook
  const { kpiData, payments, activeTab, setActiveTab, isLoading, error } =
    useFinancialDashboard(user, userPermissions.canAccessPage);

  // Efeito de guarda (sem alterações)
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
    setShowContent(true);
  }, [user, isLoadingAuth, userPermissions.canAccessPage, router]);

  // MUDANÇA: Cria uma lista filtrada com base na aba ativa
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
        return payments; // Por enquanto, mostra todos
      default:
        return [];
    }
  }, [activeTab, payments]);

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
      title="Dashboard Financeiro"
      description="Acompanhamento de pagamentos de alunos."
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
          {error && <Alert type="error">{error}</Alert>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? (
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

      {/* MUDANÇA: Placeholder substituído pela seção de Gestão de Pagamentos */}
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
            {isLoading ? (
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
    </PageLayout>
  );
}
