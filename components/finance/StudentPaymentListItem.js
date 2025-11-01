import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";

const StudentPaymentListItem = ({ payment, onIndicateClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(payment.amount_due);
  const formattedDate = new Date(payment.due_date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });

  // Reseta o botão "Certeza?" após 3 segundos
  useEffect(() => {
    if (!pendingAction) return;
    const timer = setTimeout(() => setPendingAction(null), 3000);
    return () => clearTimeout(timer);
  }, [pendingAction]);

  const handleIndicate = async () => {
    if (pendingAction !== "indicate") {
      setPendingAction("indicate");
      return;
    }
    setIsProcessing(true);
    await onIndicateClick(payment.id);
    // Não precisa resetar o estado, pois o componente
    // será re-renderizado com user_notified_payment = true
  };

  // Determina o status/botão
  let statusBadge;
  let actionButton;

  if (payment.status === "CONFIRMED") {
    statusBadge = (
      <span className="px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
        Confirmado
      </span>
    );
  } else if (payment.status === "OVERDUE") {
    statusBadge = (
      <span className="px-2 py-0.5 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
        Atrasado
      </span>
    );
  } else if (payment.user_notified_payment) {
    statusBadge = (
      <span className="px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
        Aviso Enviado
      </span>
    );
  } else {
    // PENDENTE e não notificado
    statusBadge = (
      <span className="px-2 py-0.5 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">
        Pendente
      </span>
    );
    actionButton = (
      <Button
        size="small"
        variant={pendingAction === "indicate" ? "warning" : "primary"}
        className="w-full sm:w-auto"
        onClick={handleIndicate}
        disabled={isProcessing}
      >
        {isProcessing
          ? "Avisando..."
          : pendingAction === "indicate"
            ? "Certeza?"
            : "Avisar Pagamento"}
      </Button>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-800">{payment.plan_name}</p>
          {statusBadge}
        </div>
        <p className="text-sm text-gray-500">Vencimento: {formattedDate}</p>
      </div>

      <div className="flex items-center gap-4 w-full sm:w-auto">
        {actionButton}
        <p className="font-semibold text-lg text-gray-700 w-1/2 sm:w-32 sm:text-right">
          {formattedAmount}
        </p>
      </div>
    </div>
  );
};

export default StudentPaymentListItem;
