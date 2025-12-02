import React, { useState } from "react";
import SubscriptionDetails from "components/ui/SubscriptionDetails";
import Button from "components/ui/Button";
import { FiEdit2, FiChevronDown, FiChevronUp } from "react-icons/fi";

const SubscriptionAccordionItem = ({
  subscription,
  onEditClick,
  startOpen = false,
  canManage = false,
}) => {
  const [isOpen, setIsOpen] = useState(startOpen);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* --- Cabeçalho do Acordeão --- */}
      <div
        className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 cursor-pointer gap-3 sm:gap-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* -- Parte Superior (Mobile) / Esquerda (Desktop) -- */}
        <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1 sm:justify-start sm:gap-3">
          {/* Nome do Plano */}
          <p className="font-bold text-gray-800">{subscription.plan_name}</p>

          {/* Wrapper para Status + Chevron Mobile */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                subscription.is_active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {subscription.is_active ? "Ativa" : "Inativa"}
            </span>

            {/* Ícone Chevron (Visível apenas no Mobile na parte de cima) */}
            <div className="sm:hidden text-gray-500">
              {isOpen ? (
                <FiChevronUp className="h-5 w-5" />
              ) : (
                <FiChevronDown className="h-5 w-5" />
              )}
            </div>
          </div>
        </div>

        {/* -- Parte Inferior (Mobile) / Direita (Desktop) -- */}
        {/* LOGICA APLICADA AQUI:
        Se canManage é true (tem botão) -> "flex" (ocupa espaço no mobile e desktop).
        Se canManage é false (sem botão) -> "hidden sm:flex".
           - Mobile: vira "hidden", eliminando o gap vertical.
           - Desktop: vira "flex", mantendo o Chevron alinhado à direita.
    */}
        <div
          className={`w-full sm:w-auto items-center sm:gap-4 ${
            canManage ? "flex" : "hidden sm:flex"
          }`}
        >
          {canManage && (
            <Button
              size="small"
              variant="secondary"
              className="w-full sm:w-auto justify-center" // Botão esticado no mobile
              onClick={(e) => {
                e.stopPropagation();
                onEditClick();
              }}
            >
              <FiEdit2 className="mr-2" />
              Editar
            </Button>
          )}

          {/* Ícone Chevron (Visível apenas no Desktop na direita) */}
          <div className="hidden sm:block text-gray-500">
            {isOpen ? (
              <FiChevronUp className="h-5 w-5" />
            ) : (
              <FiChevronDown className="h-5 w-5" />
            )}
          </div>
        </div>
      </div>

      {/* --- Conteúdo (Detalhes) --- */}
      {isOpen && (
        <div className="p-4 border-t border-gray-200">
          <SubscriptionDetails subscription={subscription} />
        </div>
      )}
    </div>
  );
};

export default SubscriptionAccordionItem;
