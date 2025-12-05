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
    statusBadge = (
      <span className="px-2 py-0.5 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">
        Pendente
      </span>
    );
    actionButton = (
      <Button
        size="small"
        variant={pendingAction === "indicate" ? "warning" : "primary"}
        className="w-full sm:w-auto transition-all" // Adicionado transition para suavidade
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
    <div className="bg-white p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:shadow-md">
      {/* --- BLOCO DE INFORMAÇÕES (Esquerda Desktop / Topo Mobile) --- */}
      <div className="flex-1">
        {/* Linha Superior: Nome do Plano e Preço (Mobile apenas) */}
        <div className="flex justify-between items-start">
          <p className="font-bold text-gray-800 text-base sm:text-lg">
            {payment.plan_name}
          </p>

          {/* PREÇO MOBILE: Visível apenas em telas pequenas, alinhado ao topo direita */}
          <p className="font-semibold text-gray-700 sm:hidden">
            {formattedAmount}
          </p>
        </div>

        {/* Linha Inferior: Badge e Data */}
        <div className="w-full flex flex-wrap items-center justify-between sm:justify-start gap-x-4 gap-y-2 mt-2 sm:mt-0">
          {statusBadge}

          <p className="text-sm text-gray-500">
            Vencimento: <span className="font-medium">{formattedDate}</span>
          </p>
        </div>
      </div>

      {/* --- BLOCO DE AÇÃO E PREÇO (Direita Desktop / Baixo Mobile) --- */}
      <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:gap-6">
        {/* Botão de Ação: Se existir, ocupa 100% no mobile e tamanho auto no desktop */}
        {actionButton && <div className="w-full sm:w-auto">{actionButton}</div>}

        {/* PREÇO DESKTOP: Visível apenas em telas md/lg */}
        <p className="hidden sm:block font-semibold text-lg text-gray-700 min-w-[100px] text-right">
          {formattedAmount}
        </p>
      </div>
    </div>
  );
};

export default StudentPaymentListItem;
