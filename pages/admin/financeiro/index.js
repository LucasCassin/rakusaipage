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
// MUDANÇA: Ícones mais representativos
import { FiUsers, FiDollarSign, FiClock, FiCheckSquare } from "react-icons/fi";

// Definição de permissões por seção
const PERMISSIONS_KPI_SECTION = [
  "read:payment:other",
  "read:subscription:other",
];
// ... futuras seções aqui

export default function FinancialDashboardPage() {
  const router = useRouter();
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [authError, setAuthError] = useState(null);

  const userPermissions = useMemo(() => {
    const userFeatures = user?.features || [];
    const hasPermission = (requiredFeatures) =>
      requiredFeatures.some((feature) => userFeatures.includes(feature));
    const canViewKPIs = hasPermission(PERMISSIONS_KPI_SECTION);
    // ... futuras seções aqui
    return {
      canViewKPIs,
      canAccessPage: canViewKPIs, // A página é acessível se pelo menos uma seção for visível
    };
  }, [user]);

  const {
    kpiData,
    isLoading: isLoadingKPIs,
    error: kpiError,
  } = useFinancialDashboard(user, userPermissions.canViewKPIs);

  // Efeito de guarda de autenticação e autorização
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
      // MUDANÇA: Aumenta a largura máxima do contêiner da página
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
          {kpiError && <Alert type="error">{kpiError}</Alert>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingKPIs ? (
              <>
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
              </>
            ) : (
              <>
                {/* MUDANÇA: Adicionadas as props 'color' e novos ícones */}
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

      <div className="mt-12">{/* Placeholder para a próxima seção */}</div>
    </PageLayout>
  );
}
