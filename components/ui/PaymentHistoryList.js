import React from "react";
import { FiCheckCircle, FiClock, FiAlertTriangle } from "react-icons/fi";

// Sub-componente para um item da lista de histórico
const PaymentHistoryItem = ({ payment }) => {
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(payment.amount_due);
  const dueDate = new Date(payment.due_date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });

  const statusInfo = {
    CONFIRMED: {
      text: "Confirmado",
      icon: FiCheckCircle,
      color: "text-green-600 bg-green-100",
    },
    PENDING: {
      text: "Pendente",
      icon: FiClock,
      color: "text-yellow-600 bg-yellow-100",
    },
    OVERDUE: {
      text: "Atrasado",
      icon: FiAlertTriangle,
      color: "text-red-600 bg-red-100",
    },
  };

  const currentStatus = statusInfo[payment.status] || {
    text: "Desconhecido",
    icon: FiAlertTriangle,
    color: "text-gray-600 bg-gray-100",
  };
  const Icon = currentStatus.icon;

  return (
    <div className="bg-white p-4 rounded-md border border-gray-200 flex justify-between items-center">
      <div>
        <p className="font-semibold text-gray-800">
          {payment.plan_name || "Plano"}
        </p>
        <p className="text-sm text-gray-500">Vencimento: {dueDate}</p>
        {payment.confirmed_at && (
          <p className="text-xs text-green-700">
            Pago em:{" "}
            {new Date(payment.confirmed_at).toLocaleString("pt-BR", {
              timeZone: "UTC",
            })}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <p className="font-bold text-lg text-gray-900 hidden sm:block">
          {formattedAmount}
        </p>
        <div
          className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${currentStatus.color}`}
        >
          <Icon className="h-4 w-4" />
          <span>{currentStatus.text}</span>
        </div>
      </div>
    </div>
  );
};

// Componente principal que renderiza a lista
const PaymentHistoryList = ({ payments, showTitle = true }) => {
  if (!payments || payments.length === 0) {
    return (
      <p className="text-gray-500 text-center py-6">
        Nenhum histórico de pagamento encontrado.
      </p>
    );
  }

  return (
    <div className="mt-6">
      {showTitle && (
        <h4 className="text-md font-semibold text-gray-800 mb-4">
          Histórico de Pagamentos
        </h4>
      )}
      <div className="space-y-3">
        {payments.map((p) => (
          <PaymentHistoryItem key={p.id} payment={p} />
        ))}
      </div>
    </div>
  );
};

export default PaymentHistoryList;
