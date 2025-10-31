import React from "react";

const DetailItem = ({ label, value }) => (
  <div>
    <p className="text-sm font-medium text-gray-500">{label}</p>
    <p className="mt-1 text-sm text-gray-900 font-semibold">{value}</p>
  </div>
);

const SubscriptionDetails = ({ subscription }) => {
  if (!subscription) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <p className="text-gray-500">
          Nenhuma assinatura ativa encontrada para este usuário.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h4 className="text-md font-semibold text-gray-800 mb-4">
        Detalhes da Assinatura
      </h4>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">
        <DetailItem
          label="Plano"
          value={`${subscription.plan_name} (${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(subscription.plan_full_value)})`}
        />
        <DetailItem
          label="Valor do Desconto"
          value={new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(subscription.discount_value)}
        />
        <DetailItem
          label="Dia do Pagamento"
          value={`Todo dia ${subscription.payment_day}`}
        />
        <DetailItem
          label="Data de Início"
          value={new Date(subscription.start_date).toLocaleDateString("pt-BR", {
            timeZone: "UTC",
          })}
        />
        <DetailItem
          label="Status"
          value={subscription.is_active ? "Ativa" : "Inativa"}
        />
      </dl>
    </div>
  );
};

export default SubscriptionDetails;
