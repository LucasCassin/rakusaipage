import React from "react";
import { usePaymentManagement } from "src/hooks/usePaymentManagement";
import PaymentManagementTabs from "components/ui/PaymentManagementTabs";
import PaymentListItem from "components/ui/PaymentListItem";
import PaymentListSkeleton from "components/ui/PaymentListSkeleton";
import Alert from "components/ui/Alert";
import Button from "components/ui/Button"; // <-- Importar Button
import { FiRefreshCw } from "react-icons/fi"; // <-- Importar Ícone

export default function PaymentManagement({ user, canFetch }) {
  const {
    payments,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    confirmPayment,
    deletePayment,
    isTaskRunning,
    runManualTasks,
  } = usePaymentManagement(user, canFetch);

  return (
    // --- SEPARADOR ADICIONADO ---
    <div className="my-20 border-t border-gray-200 pt-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Gestão de Pagamentos
        </h3>
        <Button
          size="small"
          variant="secondary"
          onClick={runManualTasks}
          disabled={isTaskRunning}
          className="w-full sm:w-auto justify-center"
        >
          <FiRefreshCw
            className={`mr-2 ${isTaskRunning ? "animate-spin" : ""}`}
          />
          {isTaskRunning ? "Executando..." : "Executar Tarefas"}
        </Button>
      </div>

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
