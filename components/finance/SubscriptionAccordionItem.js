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
        className="flex justify-between items-center p-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1">
          <p className="font-bold text-gray-800">{subscription.plan_name}</p>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              subscription.is_active
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {subscription.is_active ? "Ativa" : "Inativa"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {canManage && (
            <Button
              size="small"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation(); // Impede o acordeão de fechar
                onEditClick();
              }}
            >
              <FiEdit2 className="mr-2" />
              Editar
            </Button>
          )}
          {isOpen ? (
            <FiChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <FiChevronDown className="h-5 w-5 text-gray-500" />
          )}
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
