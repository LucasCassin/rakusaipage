import React, { useState, useEffect } from "react";
import Button from "./Button";
import { usePaymentNotification } from "src/hooks/usePaymentNotification";
import { FiBell, FiAlertTriangle, FiCheck, FiTrash2 } from "react-icons/fi";

const PaymentListItem = ({ payment, onConfirmClick, onDeleteClick }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const { notifyPayment, isNotifying } = usePaymentNotification();

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(payment.amount_due);

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

  const handleNotify = async () => {
    if (pendingAction !== "notify") {
      setPendingAction("notify");
      return;
    }

    await notifyPayment(payment.id, {
      onSuccess: () => {
        setPendingAction(null);
      },
    });
  };

  const renderBadges = () => (
    <>
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
    </>
  );

  return (
    <div className="bg-white p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      {/* --- LADO ESQUERDO --- */}
      <div className="w-full sm:flex-1">
        {/* Container Principal da Info */}
        <div className="flex flex-col gap-1 w-full">
          {/* LINHA 1: NOME+BADGE (Esq) vs PREÇO (Dir) */}
          <div className="flex justify-between items-start">
            {/* ESQUERDA: Nome e Badge juntos */}
            <div className="flex items-center gap-2 flex-wrap pr-2">
              <p className="font-bold text-gray-800">
                {payment.username || "Desconhecido"}
              </p>
              {renderBadges()}
            </div>

            {/* DIREITA: Preço (Apenas Mobile) */}
            <div className="block sm:hidden whitespace-nowrap">
              <p className="font-bold text-lg text-gray-700">
                {formattedAmount}
              </p>
            </div>
          </div>

          {/* LINHA 2: Plano e Data */}
          <p className="text-sm text-gray-500">
            {payment.plan_name} - Venc: {formattedDate}
          </p>

          {/* LINHA EXTRA: Data de Pagamento (se houver) */}
          {payment.status === "CONFIRMED" && payment.confirmed_at && (
            <p className="text-xs text-green-700">
              Pago em:{" "}
              {new Date(payment.confirmed_at).toLocaleDateString("pt-BR", {
                timeZone: "UTC",
              })}
            </p>
          )}
        </div>
      </div>

      {/* --- LADO DIREITO (Botões e Preço Desktop) - SEM MUDANÇAS --- */}
      <div
        className={`w-full sm:w-auto items-center gap-2 ${
          payment.status !== "CONFIRMED" ? "flex" : "hidden sm:flex"
        }`}
      >
        {payment.status !== "CONFIRMED" && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              size="small"
              variant={
                pendingAction === "notify"
                  ? "warning"
                  : payment.status === "OVERDUE"
                    ? "danger"
                    : "secondary"
              }
              className="flex-1 sm:w-auto justify-center px-0 sm:px-4"
              onClick={handleNotify}
              disabled={
                isNotifying ||
                isProcessing ||
                (pendingAction && pendingAction !== "notify")
              }
            >
              {isNotifying ? (
                "Enviando..."
              ) : pendingAction === "notify" ? (
                "Certeza?"
              ) : (
                <>
                  <span className="block sm:hidden text-lg">
                    {payment.status === "OVERDUE" ? (
                      <FiAlertTriangle />
                    ) : (
                      <FiBell />
                    )}
                  </span>
                  <span className="hidden sm:block">
                    {payment.status === "OVERDUE" ? "Cobrar" : "Lembrar"}
                  </span>
                </>
              )}
            </Button>

            <Button
              size="small"
              variant={pendingAction === "confirm" ? "warning" : "primary"}
              className="flex-1 sm:w-auto justify-center px-0 sm:px-4"
              onClick={handleConfirm}
              disabled={
                isProcessing || (pendingAction && pendingAction !== "confirm")
              }
            >
              {isProcessing && pendingAction === "confirm" ? (
                "Confirmando..."
              ) : pendingAction === "confirm" ? (
                "Certeza?"
              ) : (
                <>
                  <span className="block sm:hidden text-lg">
                    <FiCheck />
                  </span>
                  <span className="hidden sm:block">Confirmar</span>
                </>
              )}
            </Button>

            <Button
              size="small"
              variant={pendingAction === "delete" ? "warning" : "danger"}
              className="flex-1 sm:w-auto justify-center px-0 sm:px-4"
              onClick={handleDelete}
              disabled={
                isProcessing || (pendingAction && pendingAction !== "delete")
              }
            >
              {isProcessing && pendingAction === "delete" ? (
                "Deletando..."
              ) : pendingAction === "delete" ? (
                "Certeza?"
              ) : (
                <>
                  <span className="block sm:hidden text-lg">
                    <FiTrash2 />
                  </span>
                  <span className="hidden sm:block">Deletar</span>
                </>
              )}
            </Button>
          </div>
        )}

        <p className="hidden sm:block font-semibold text-lg text-gray-700 w-32 text-right">
          {formattedAmount}
        </p>
      </div>
    </div>
  );
};

export default PaymentListItem;
