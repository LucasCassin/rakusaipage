import React, { useState, useEffect } from "react";
import Button from "./Button";

const PaymentListItem = ({ payment, onConfirmClick, onDeleteClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(payment.amount_due);

  // Alterei para 'toLocaleString' para incluir a hora,
  // mas 'toLocaleDateString' (como está no seu) também funciona
  const formattedDate = new Date(payment.due_date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });

  useEffect(() => {
    if (!pendingAction) return;
    const timer = setTimeout(() => setPendingAction(null), 3000);
    return () => clearTimeout(timer);
  }, [pendingAction]);

  const handleConfirm = async () => {
    if (pendingAction !== "confirm") {
      setPendingAction("confirm");
      return;
    }
    setIsProcessing(true);
    await onConfirmClick(payment.id);
  };

  const handleDelete = async () => {
    if (pendingAction !== "delete") {
      setPendingAction("delete");
      return;
    }
    setIsProcessing(true);
    await onDeleteClick(payment.id);
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-800">
            {payment.username || "Desconhecido"}
          </p>

          {/* ... (Badges de status 'Avisado', 'Confirmado', 'Atrasado' permanecem aqui) ... */}
          {payment.user_notified_payment && payment.status !== "CONFIRMED" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
              Avisado
            </span>
          )}
          {payment.status === "CONFIRMED" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
              Confirmado
            </span>
          )}
          {payment.status === "OVERDUE" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
              Atrasado
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {payment.plan_name} - Venc: {formattedDate}
        </p>

        {/* --- ADICIONADO (baseado no PaymentHistoryList.js) --- */}
        {payment.status === "CONFIRMED" && payment.confirmed_at && (
          <p className="text-xs text-green-700 mt-1">
            Pago em:{" "}
            {new Date(payment.confirmed_at).toLocaleDateString("pt-BR", {
              timeZone: "UTC",
            })}
          </p>
        )}
        {/* --- FIM DA ADIÇÃO --- */}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {payment.status !== "CONFIRMED" && (
          <>
            <Button
              size="small"
              variant={pendingAction === "confirm" ? "warning" : "primary"}
              className="w-1/2 sm:w-auto"
              onClick={handleConfirm}
              disabled={
                isProcessing || (pendingAction && pendingAction !== "confirm")
              }
            >
              {isProcessing && pendingAction === "confirm"
                ? "Confirmando..."
                : pendingAction === "confirm"
                  ? "Certeza?"
                  : "Confirmar"}
            </Button>

            <Button
              size="small"
              variant={pendingAction === "delete" ? "warning" : "danger"}
              className="w-1/2 sm:w-auto"
              onClick={handleDelete}
              disabled={
                isProcessing || (pendingAction && pendingAction !== "delete")
              }
            >
              {isProcessing && pendingAction === "delete"
                ? "Deletando..."
                : pendingAction === "delete"
                  ? "Certeza?"
                  : "Deletar"}
            </Button>
          </>
        )}

        <p className="font-semibold text-lg text-gray-700 w-full sm:w-32 sm:text-right mt-2 sm:mt-0">
          {formattedAmount}
        </p>
      </div>
    </div>
  );
};

export default PaymentListItem;
