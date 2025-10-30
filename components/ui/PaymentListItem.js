import React, { useState, useEffect } from "react";
import Button from "./Button";
import { FiCheck, FiTrash2 } from "react-icons/fi"; // Adiciona FiTrash2

const PaymentListItem = ({ payment, onConfirmClick, onDeleteClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  // Estado para a confirmação: null, 'confirm', ou 'delete'
  const [pendingAction, setPendingAction] = useState(null);

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(payment.amount_due);
  const formattedDate = new Date(payment.due_date).toLocaleString("pt-BR", {
    timeZone: "UTC",
  });

  // Este Effect reseta o botão se o usuário não confirmar em 3s
  useEffect(() => {
    if (!pendingAction) return;
    const timer = setTimeout(() => setPendingAction(null), 3000);
    return () => clearTimeout(timer); // Limpa o timer se o componente for desmontado
  }, [pendingAction]);

  // --- NOVOS HANDLERS ---
  const handleConfirm = async () => {
    if (pendingAction !== "confirm") {
      setPendingAction("confirm");
      return;
    }
    setIsProcessing(true);
    await onConfirmClick(payment.id);
    setIsProcessing(false);
    setPendingAction(null);
    // O item será atualizado via props, então 'isProcessing' e 'pendingAction'
    // serão resetados quando o componente re-renderizar com o novo status.
  };

  const handleDelete = async () => {
    if (pendingAction !== "delete") {
      setPendingAction("delete");
      return;
    }
    setIsProcessing(true);
    await onDeleteClick(payment.id);
    setIsProcessing(false);
    setPendingAction(null);
    // O item será removido da lista, então não precisamos resetar o estado.
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      {/* ... (Div da esquerda com o nome e status - permanece igual) ... */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-800">
            {payment.username || "Desconhecido"}
          </p>
          {payment.user_notified_payment && payment.status !== "CONFIRMED" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
              Avisado
            </span>
          )}
          {payment.status === "PENDING" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-yellow-600 bg-yellow-100 rounded-full">
              Confirmado
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
      </div>

      {/* --- SEÇÃO DE BOTÕES ATUALIZADA --- */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {payment.status !== "CONFIRMED" && (
          <>
            <Button
              size="small"
              // Muda a cor e o texto baseado no estado de confirmação
              variant={pendingAction === "confirm" ? "warning" : "primary"}
              className="w-1/2 sm:w-auto"
              onClick={handleConfirm}
              // Desabilita se estiver processando OU se outro botão estiver em modo de confirmação
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

            {/* O NOVO BOTÃO DE DELETAR */}
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
