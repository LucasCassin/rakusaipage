import React from "react";
import { usePaymentManagement } from "src/hooks/usePaymentManagement";
import PaymentManagementTabs from "components/ui/PaymentManagementTabs";
import PaymentListItem from "components/ui/PaymentListItem";
import PaymentListSkeleton from "components/ui/PaymentListSkeleton";
import Alert from "components/ui/Alert";

export default function PaymentManagement({ user, canFetch }) {
  const {
    payments,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    confirmPayment,
    deletePayment,
  } = usePaymentManagement(user, canFetch);

  return (
    // --- SEPARADOR ADICIONADO ---
    <div className="my-20 border-t border-gray-200 pt-12">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Gestão de Pagamentos
      </h3>

      {/* Mostra erros (ex: falha ao confirmar) */}
      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      <PaymentManagementTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* --- LISTA COM SCROLL E ALTURA MÁXIMA --- */}
      <div className="mt-6 space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-full pr-2">
        {isLoading ? (
          <PaymentListSkeleton />
        ) : payments.length > 0 ? (
          payments.map((payment) => (
            <PaymentListItem
              key={payment.id}
              payment={payment}
              onConfirmClick={confirmPayment}
              onDeleteClick={deletePayment}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 py-8">
            Nenhum pagamento encontrado para esta categoria.
          </p>
        )}
      </div>
      {/* --- FIM DA ATUALIZAÇÃO --- */}
    </div>
  );
}
