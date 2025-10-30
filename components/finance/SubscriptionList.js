import React from "react";
import SubscriptionAccordionItem from "components/finance/SubscriptionAccordionItem";

const SubscriptionList = ({ subscriptions, onEditClick, showEditButton }) => {
  // Caso 1: Nenhuma assinatura
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-center">
          Nenhuma assinatura ativa encontrada para este usuário.
        </p>
      </div>
    );
  }

  // Caso 2: Apenas UMA assinatura (como você pediu)
  if (subscriptions.length === 1) {
    return (
      <SubscriptionAccordionItem
        subscription={subscriptions[0]}
        onEditClick={() => onEditClick(subscriptions[0])}
        startOpen={true} // Começa aberto
        showEditButton={showEditButton}
      />
    );
  }

  // Caso 3: Múltiplas assinaturas (Acordeão)
  return (
    <div className="space-y-3">
      {subscriptions.map((sub) => (
        <SubscriptionAccordionItem
          key={sub.id}
          subscription={sub}
          onEditClick={() => onEditClick(sub)}
          showEditButton={showEditButton}
        />
      ))}
    </div>
  );
};

export default SubscriptionList;
