import React from "react";
import { usePaymentManagement } from "src/hooks/usePaymentManagement";
import PaymentManagementTabs from "components/ui/PaymentManagementTabs";
import PaymentListItem from "components/ui/PaymentListItem";
import PaymentListSkeleton from "components/ui/PaymentListSkeleton";

export default function PaymentManagement({ user, canFetch }) {
  const { payments, activeTab, setActiveTab, isLoading, error } =
    usePaymentManagement(user, canFetch);

  return (
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
        ) : payments.length > 0 ? (
          payments.map((payment) => (
            <PaymentListItem key={payment.id} payment={payment} />
          ))
        ) : (
          <p className="text-center text-gray-500 py-8">
            Nenhum pagamento encontrado para esta categoria.
          </p>
        )}
      </div>
    </div>
  );
}
