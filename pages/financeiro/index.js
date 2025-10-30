import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "src/contexts/AuthContext.js";
import { settings } from "config/settings.js";

import PageLayout from "components/layouts/PageLayout";
import InitialLoading from "components/InitialLoading";
import Alert from "components/ui/Alert";
import UserFinancialsSkeleton from "components/ui/UserFinancialsSkeleton";
import PaymentHistoryList from "components/ui/PaymentHistoryList";

// --- 1. IMPORTAR O CONTEXTO ---
import { useFinancialsDashboard } from "src/contexts/FinancialsDashboardContext";
import { useUserFinancials } from "src/hooks/useUserFinancials";
import SubscriptionList from "components/finance/SubscriptionList";
import StudentPaymentListItem from "components/finance/StudentPaymentListItem";

// ... (Definições de permissões permanecem as mesmas) ...
const PERMISSIONS_PENDING_PAYMENTS = [
  "read:payment:self",
  "update:payment:indicate_paid",
];
const PERMISSIONS_SUBSCRIPTIONS = ["read:subscription:self"];
const PERMISSIONS_PAYMENT_HISTORY = ["read:payment:self"];

export default function StudentFinancePage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [authError, setAuthError] = useState(null);
  const router = useRouter();

  // --- 2. PEGAR O GATILHO ---
  const { kpiTrigger } = useFinancialsDashboard();

  // ... (usePermissions permanece o mesmo) ...
  const userPermissions = useMemo(() => {
    // ...
    const userFeatures = user?.features || [];
    const hasPermission = (requiredFeatures) =>
      requiredFeatures.every((feature) => userFeatures.includes(feature));
    const hasAnyPermission = (requiredFeatures) =>
      requiredFeatures.some((feature) => userFeatures.includes(feature));

    const canViewPending = hasPermission(PERMISSIONS_PENDING_PAYMENTS);
    const canViewSubscriptions = hasAnyPermission(PERMISSIONS_SUBSCRIPTIONS);
    const canViewHistory = hasAnyPermission(PERMISSIONS_PAYMENT_HISTORY);

    return {
      canViewPending,
      canViewSubscriptions,
      canViewHistory,
      canAccessPage: canViewPending || canViewSubscriptions || canViewHistory,
    };
  }, [user]);

  // ... (Guarda de Autenticação permanece a mesma) ...
  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      router.push(settings.global.REDIRECTS.LOGIN);
      return;
    }
    if (!userPermissions.canAccessPage) {
      setAuthError(
        "Você não tem permissão para acessar sua página financeira.",
      );
      setTimeout(() => router.push(settings.global.REDIRECTS.HOME), 2000);
      return;
    }
    setShowContent(true);
  }, [user, isLoadingAuth, userPermissions.canAccessPage, router]);

  // Hook de Dados
  const {
    financialData,
    isLoading: isLoadingFinancials,
    error,
    indicatePaid,
    fetchUserFinancials, // <-- 3. PEGAR A FUNÇÃO DE BUSCA
  } = useUserFinancials(user);

  // --- 4. O useEffect QUE FALTAVA ---
  useEffect(() => {
    // Só busca se a página estiver visível E o usuário estiver pronto
    if (showContent && user) {
      fetchUserFinancials(user.username);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showContent, user, kpiTrigger]);
  // Roda quando 'showContent' vira true, e quando o 'kpiTrigger' muda
  // (Não precisamos de 'fetchUserFinancials' aqui, pois ele é estável)
  // ------------------------------------

  // ... (useMemo para filtrar os dados permanece o mesmo) ...
  const { pendingPayments, otherPayments, subscriptions } = useMemo(() => {
    // ...
    if (!financialData) {
      return { pendingPayments: [], otherPayments: [], subscriptions: [] };
    }
    const allPayments = financialData.payments || [];
    const subs = financialData.subscriptions || [];
    const activeSubs = subs.filter((s) => s.is_active);
    const pending = allPayments.filter(
      (p) => p.status === "PENDING" || p.status === "OVERDUE",
    );
    const other = allPayments.filter((p) => p.status === "CONFIRMED");
    return {
      pendingPayments: pending,
      otherPayments: other,
      subscriptions: activeSubs,
    };
  }, [financialData]);

  // Renderização
  if (isLoadingAuth || !showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <InitialLoading
          message={authError ? "Acesso negado..." : "Carregando seus dados..."}
        />
      </div>
    );
  }

  return (
    // O Provider está no _app.js, o que é correto
    <PageLayout
      title="Minhas Finanças"
      description="Acompanhamento de pagamentos e assinaturas"
      maxWidth="max-w-4xl"
    >
      {/* --- 4. RENDERIZAÇÃO CONDICIONAL --- */}
      {authError && (
        <Alert type="error" className="mt-8">
          {authError}
        </Alert>
      )}

      {!authError && (
        <>
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Minhas Finanças
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Acompanhe suas assinaturas e pagamentos.
            </p>
          </div>

          {/* Erro de API (ex: falha no 'indicatePaid') */}
          {error && (
            <Alert type="error" className="mt-8">
              {error}
            </Alert>
          )}

          {isLoadingFinancials ? (
            <div className="mt-8">
              <UserFinancialsSkeleton />
            </div>
          ) : (
            <>
              {/* --- 1. SEÇÃO DE AÇÕES (GESTÃO) --- */}
              {userPermissions.canViewPending && (
                <div className="mt-12">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Pagamentos Pendentes
                  </h3>
                  <div className="mt-6 space-y-4">
                    {pendingPayments.length > 0 ? (
                      pendingPayments.map((payment) => (
                        <StudentPaymentListItem
                          key={payment.id}
                          payment={payment}
                          onIndicateClick={indicatePaid}
                        />
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        Você não possui pagamentos pendentes.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* --- 2. SEÇÃO DE ASSINATURAS (HISTÓRICO) --- */}
              {userPermissions.canViewSubscriptions && (
                <div className="mt-12 border-t border-gray-200 pt-12">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Minhas Assinaturas Ativas
                  </h3>
                  <div className="space-y-6">
                    <SubscriptionList
                      subscriptions={subscriptions}
                      canManage={false} // <-- Esconde o botão "Editar"
                    />
                  </div>
                </div>
              )}

              {/* --- 3. SEÇÃO DE PAGAMENTOS (HISTÓRICO) --- */}
              {userPermissions.canViewHistory && (
                <div className="mt-12 border-t border-gray-200 pt-12">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Histórico de Pagamentos Confirmados
                  </h3>
                  <div className="space-y-6">
                    {/* Reutiliza o PaymentHistoryList da consulta do admin */}
                    <PaymentHistoryList
                      payments={otherPayments}
                      showTitle={false}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageLayout>
  );
}
