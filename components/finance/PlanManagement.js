import React from "react";
import { usePaymentPlans } from "src/hooks/usePaymentPlans";
import PlanListItem from "components/ui/PlanListItem";
import PlanListSkeleton from "components/ui/PlanListSkeleton";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";

export default function PlanManagement({ user, canFetch }) {
  const { plans, isLoading, error } = usePaymentPlans(user, canFetch);

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Planos de Pagamento
        </h3>
        <Button variant="primary" size="small" disabled={true}>
          + Criar Novo Plano
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="bg-white rounded-lg shadow-md border border-gray-200 divide-y divide-gray-200">
        {isLoading ? (
          <PlanListSkeleton />
        ) : plans.length > 0 ? (
          plans.map((plan) => <PlanListItem key={plan.id} plan={plan} />)
        ) : (
          <p className="text-center text-gray-500 p-8">
            Nenhum plano de pagamento criado.
          </p>
        )}
      </div>
    </div>
  );
}
