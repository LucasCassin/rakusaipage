import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { useUserFinancials } from "src/hooks/useUserFinancials";
import StudentPaymentListItem from "components/finance/StudentPaymentListItem";
import PaymentListSkeleton from "components/ui/PaymentListSkeleton";
import Alert from "components/ui/Alert";
import {
  FiAlertTriangle, // Ícone de Alerta (Amarelo/Vencido)
  FiClock, // Ícone de Pendente (Neutro/Cinza)
  FiCheckCircle, // Ícone de Avisado (Azul)
  FiArrowRight,
} from "react-icons/fi";

// ... (Permissões, hook, useEffect de busca permanecem os mesmos) ...
const PERMISSIONS_PENDING_PAYMENTS = [
  "read:payment:self",
  "update:payment:indicate_paid",
];

export default function PendingPaymentsSection({ user }) {
  const userPermissions = useMemo(() => {
    const userFeatures = user?.features || [];
    return PERMISSIONS_PENDING_PAYMENTS.every((feature) =>
      userFeatures.includes(feature),
    );
  }, [user]);

  const {
    financialData,
    isLoading: isLoadingFinancials,
    error,
    indicatePaid,
    fetchUserFinancials,
  } = useUserFinancials(user);

  useEffect(() => {
    if (user && userPermissions) {
      fetchUserFinancials(user.username);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userPermissions]);

  const pendingPayments = useMemo(() => {
    if (!financialData || !financialData.payments) return [];
    return financialData.payments.filter(
      (p) => p.status === "PENDING" || p.status === "OVERDUE",
    );
  }, [financialData]);

  // --- LÓGICA DE ESTILO ATUALIZADA ---
  const sectionStyle = useMemo(() => {
    if (pendingPayments.length === 0) {
      return null;
    }

    // AMARELO (Alerta): Se houver ALGUM pagamento vencido E não avisado
    if (
      pendingPayments.some(
        (p) => p.status === "OVERDUE" && !p.user_notified_payment,
      )
    ) {
      return {
        style: "bg-yellow-50 border-yellow-200", // MUDADO (Era Vermelho)
        iconColor: "text-yellow-600",
        titleColor: "text-yellow-800",
        Icon: FiAlertTriangle, // Ícone de alerta
        title: "Pagamentos Vencidos",
      };
    }

    // AZUL (Aviso): Se TODOS os pagamentos pendentes já foram avisados
    if (pendingPayments.every((p) => p.user_notified_payment)) {
      return {
        style: "bg-blue-50 border-blue-200",
        iconColor: "text-blue-600",
        titleColor: "text-blue-800",
        Icon: FiCheckCircle,
        title: "Pagamentos em Análise",
      };
    }

    // NEUTRO (Padrão): Se houver pagamentos pendentes (não vencidos) E não avisados
    return {
      style: "bg-gray-50 border-gray-200", // MUDADO (Era Amarelo)
      iconColor: "text-gray-600",
      titleColor: "text-gray-800",
      Icon: FiClock, // Ícone neutro
      title: "Pagamentos Pendentes",
    };
  }, [pendingPayments]);
  // --- FIM DA ATUALIZAÇÃO ---

  // ... (O resto do componente (lógica de loading, renderização, link)
  //      permanece exatamente o mesmo) ...

  if (!userPermissions) {
    return null;
  }

  if (isLoadingFinancials || !sectionStyle) {
    return isLoadingFinancials ? (
      <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Pagamentos Pendentes
        </h2>
        <PaymentListSkeleton rows={1} />
      </div>
    ) : null;
  }

  const { style, iconColor, titleColor, Icon, title } = sectionStyle;

  return (
    <div id="pending-payments" className={`border-2 rounded-lg p-6 ${style}`}>
      <div className="flex items-center mb-4">
        <Icon className={`h-6 w-6 mr-3 ${iconColor}`} />
        <h2 className={`text-2xl font-bold ${titleColor}`}>{title}</h2>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="space-y-4">
        {pendingPayments.map((payment) => (
          <StudentPaymentListItem
            key={payment.id}
            payment={payment}
            onIndicateClick={indicatePaid}
          />
        ))}
      </div>

      <div className="mt-4 text-right">
        <Link href="/financeiro" legacyBehavior>
          <a className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
            Ver extrato completo
            <FiArrowRight className="ml-1 h-4 w-4" />
          </a>
        </Link>
      </div>
    </div>
  );
}
