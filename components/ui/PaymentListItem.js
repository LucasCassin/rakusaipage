import React from "react";
import Button from "./Button";
import { FiCheck } from "react-icons/fi";

const PaymentListItem = ({ payment }) => {
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(payment.amount_due);
  const formattedDate = new Date(payment.due_date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });

  return (
    <div className="bg-white p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-800">{payment.username}</p>

          {payment.user_notified_payment && (
            <span className="px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">
              Avisado
            </span>
          )}
          {payment.status === "CONFIRMED" && (
            <span className="px-2 py-0.5 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
              Confirmado
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {payment.plan_name} - Venc: {formattedDate}
        </p>
      </div>
      <div className="flex items-center gap-4 w-full sm:w-auto">
        {payment.status !== "CONFIRMED" && (
          <Button size="small" variant="primary" className="w-1/2 sm:w-auto">
            <FiCheck className="mr-2" />
            Confirmar
          </Button>
        )}
        <p className="font-semibold text-lg text-gray-700 w-1/2 sm:w-auto">
          {formattedAmount}
        </p>
      </div>
    </div>
  );
};

export default PaymentListItem;
