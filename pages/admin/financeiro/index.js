import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";

import PageLayout from "components/layouts/PageLayout";
import InitialLoading from "components/InitialLoading";

import { FinancialsDashboardProvider } from "src/contexts/FinancialsDashboardContext";

// Importe os NOVOS componentes "inteligentes"
import DashboardKPIs from "components/finance/DashboardKPIs";
import PaymentManagement from "components/finance/PaymentManagement";
import UserFinancials from "components/finance/UserFinancials";
import PlanManagement from "components/finance/PlanManagement";
import Alert from "components/ui/Alert";

// Definições de permissões (permanecem iguais)
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
const PERMISSIONS_PLAN_MANAGEMENT = [
  "read:payment_plan",
  "create:payment_plan",
  "update:payment_plan",
  "delete:payment_plan",
];

export default function FinancialDashboardPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [authError, setAuthError] = useState(null);
  const router = useRouter();

  const userPermissions = useMemo(() => {
    // ... (lógica de userPermissions permanece a mesma)
    const userFeatures = user?.features || [];
    const hasPermission = (requiredFeatures) =>
      requiredFeatures.some((feature) => userFeatures.includes(feature));

    const canViewKPIs = hasPermission(PERMISSIONS_KPI_SECTION);
    const canViewPaymentManagement = hasPermission(
      PERMISSIONS_PAYMENT_MANAGEMENT,
    );
    const canViewSelf = hasPermission(PERMISSIONS_USER_FINANCIALS_SELF);
    const canViewOther = hasPermission(PERMISSIONS_USER_FINANCIALS_OTHER);
    const canViewPlanManagement = hasPermission(PERMISSIONS_PLAN_MANAGEMENT);

    return {
      canViewKPIs,
      canViewPaymentManagement,
      canViewSelf,
      canViewOther,
      canViewPlanManagement,
      canAccessPage:
        canViewKPIs ||
        canViewPaymentManagement ||
        canViewSelf ||
        canViewOther ||
        canViewPlanManagement,
    };
  }, [user]);

  // Efeito de guarda (permanece igual)
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

  // filteredPayments (REMOVIDO - agora vive em PaymentManagement)

  // Renderização do InitialLoading (permanece igual)
  if (isLoadingAuth || !showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <InitialLoading message="Verificando permissões..." />
      </div>
    );
  }

  return (
    <FinancialsDashboardProvider>
      <PageLayout
        title="Dashboard Financeiro"
        description="Acompanhamento de pagamentos"
        maxWidth="max-w-7xl"
      >
        {authError && (
          <Alert type="error" className="mb-4">
            {authError}
          </Alert>
        )}

        {!authError && (
          <>
            {/* Título (permanece igual) */}
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Dashboard Financeiro
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Visão geral da saúde financeira e gestão de pagamentos.
              </p>
            </div>

            {/* Seção KPIs (MODIFICADA) */}
            {userPermissions.canViewKPIs && (
              <DashboardKPIs
                user={user}
                canFetch={userPermissions.canViewKPIs}
              />
            )}

            {/* Seção Gestão de Pagamentos (MODIFICADA) */}
            {userPermissions.canViewPaymentManagement && (
              <PaymentManagement
                user={user}
                canFetch={userPermissions.canViewPaymentManagement}
              />
            )}

            {/* Seção Consulta Financeira (permanece igual) */}
            {userPermissions.canViewOther && (
              <div className="mt-12">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Consulta Financeira de Alunos
                </h3>
                <UserFinancials
                  mode="other"
                  permissions={{ canViewOther: userPermissions.canViewOther }}
                />
              </div>
            )}

            {/* Seção Planos de Pagamento (MODIFICADA) */}
            {userPermissions.canViewPlanManagement && (
              <PlanManagement
                user={user}
                canFetch={userPermissions.canViewPlanManagement}
              />
            )}
          </>
        )}
      </PageLayout>
    </FinancialsDashboardProvider>
  );
}
