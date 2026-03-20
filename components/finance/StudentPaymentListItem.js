import React, { useState, useEffect } from "react";
import Button from "components/ui/Button";

const StudentPaymentListItem = ({
  payment,
  onIndicateClick,
  onGeneratePix,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isGeneratePixProcessing, setIsGeneratePixProcessing] = useState(false);

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(payment.amount_due);

  const formattedDate = new Date(payment.due_date).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });

  // Reset de pending action
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
    setIsProcessing(false);
  };

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
    statusBadge = (
      <span className="px-2 py-0.5 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">
        Pendente
      </span>
    );
    actionButton = (
      <div className="flex gap-2 flex-col sm:flex-row">
        <Button
          size="small"
          variant={pendingAction === "indicate" ? "warning" : "primary"}
          className="w-full sm:w-auto transition-all"
          onClick={handleIndicate}
          disabled={isProcessing}
        >
          {isProcessing
            ? "Avisando..."
            : pendingAction === "indicate"
              ? "Certeza?"
              : "Avisar Pagamento"}
        </Button>

        {onGeneratePix && (
          <Button
            size="small"
            variant="secondary"
            className="w-full sm:w-auto transition-all"
            onClick={async () => {
              setIsGeneratePixProcessing(true);
              try {
                await onGeneratePix(payment.id);
              } finally {
                setIsGeneratePixProcessing(false);
              }
            }}
            disabled={isGeneratePixProcessing}
          >
            {isGeneratePixProcessing ? "Gerando PIX..." : "Gerar PIX"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="w-full sm:flex-1">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 flex-wrap pr-2">
              <p className="font-bold text-gray-800 text-base sm:text-lg">
                {payment.plan_name}
              </p>
              {statusBadge}
            </div>
            <p className="font-semibold text-gray-700 sm:hidden">
              {formattedAmount}
            </p>
          </div>
          <div className="w-full flex flex-wrap items-center justify-between sm:justify-start gap-x-4 gap-y-2 mt-2 sm:mt-0">
            <p className="text-sm text-gray-500">
              Vencimento: <span className="font-medium">{formattedDate}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:gap-6 w-full sm:w-auto">
        {actionButton && <div className="w-full sm:w-auto">{actionButton}</div>}
        <p className="hidden sm:block font-semibold text-lg text-gray-700 min-w-[100px] text-right">
          {formattedAmount}
        </p>
      </div>
    </div>
  );
};

export default StudentPaymentListItem;
