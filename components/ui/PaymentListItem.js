import React, { useState } from "react"; // Importar useState
import Button from "./Button";
import { FiCheck } from "react-icons/fi";

const PaymentListItem = ({ payment, onConfirmClick }) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(payment.amount_due);
  const formattedDate = new Date(payment.due_date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });

  // Handler local para o clique
  const handleConfirmClick = async () => {
    setIsConfirming(true);
    await onConfirmClick(payment.id);
    // Não precisamos setar setIsConfirming(false),
    // pois a prop 'payment.status' vai mudar e o botão vai sumir.
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-800">
            {payment.username || "Desconhecido"}
          </p>

          {/* Lógica de status atualizada (adicionada com base no seu arquivo) */}
          {payment.user_notified_payment && payment.status !== "CONFIRMED" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
              Avisado
            </span>
          )}
          {payment.status === "CONFIRMED" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-green-600 bg-green-100 rounded-full">
              Confirmado
            </span>
          )}
          {payment.status === "PENDING" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-yellow-600 bg-yellow-100 rounded-full">
              Pendente
            </span>
          )}
          {payment.status === "OVERDUE" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-red-100 rounded-full">
              Atrasado
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {payment.plan_name} - Venc: {formattedDate}
        </p>
      </div>

      {/* --- SEÇÃO MODIFICADA --- */}
      <div className="flex items-center gap-4 w-full sm:w-auto">
        {payment.status !== "CONFIRMED" && (
          <Button
            size="small"
            variant="primary"
            className="w-1/2 sm:w-auto"
            onClick={handleConfirmClick} // <-- AÇÃO ADICIONADA
            disabled={isConfirming} // <-- Desabilita ao clicar
          >
            {isConfirming ? (
              "Confirmando..."
            ) : (
              <>
                <FiCheck className="mr-2" />
                Confirmar
              </>
            )}
          </Button>
        )}

        {/* CORREÇÃO DE LAYOUT APLICADA AQUI */}
        <p className="font-semibold text-lg text-gray-700 w-1/2 sm:w-32 sm:text-right">
          {formattedAmount}
        </p>
      </div>
      {/* --- FIM DA SEÇÃO MODIFICADA --- */}
    </div>
  );
};

export default PaymentListItem;
