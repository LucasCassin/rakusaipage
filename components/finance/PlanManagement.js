import React from "react";
import { usePaymentPlans } from "src/hooks/usePaymentPlans";
import PlanListItem from "components/ui/PlanListItem";
import PlanListSkeleton from "components/ui/PlanListSkeleton";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import PlanFormModal from "components/finance/PlanFormModal";
import DeletePlanModal from "components/finance/DeletePlanModal";

export default function PlanManagement({ user, canFetch }) {
  // ... (Hook permanece igual)
  const {
    plans,
    isLoading,
    error,
    isModalOpen,
    modalMode,
    currentPlan,
    modalError,
    openModal,
    closeModal,
    createPlan,
    updatePlan,
    deletePlan,
    getStats,
  } = usePaymentPlans(user, canFetch);

  return (
    // --- SEPARADOR ADICIONADO ---
    <div className="my-20 border-t border-gray-200 pt-12">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Planos de Pagamento
        </h3>
        <Button
          variant="primary"
          size="small"
          onClick={() => openModal("create")}
        >
          + Criar Novo Plano
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* A lista de planos geralmente é curta,
          então não adicionei scroll aqui,
          mas poderíamos, se necessário. */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 divide-y divide-gray-200">
        {isLoading ? (
          <PlanListSkeleton />
        ) : plans.length > 0 ? (
          plans.map((plan) => (
            <PlanListItem
              key={plan.id}
              plan={plan}
              onEditClick={() => openModal("edit", plan)}
              onDeleteClick={() => openModal("delete", plan)}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 p-8">
            Nenhum plano de pagamento criado.
          </p>
        )}
      </div>

      {/* ... (Renderização dos modais permanece igual) ... */}
      {isModalOpen && (modalMode === "create" || modalMode === "edit") && (
        <PlanFormModal
          mode={modalMode}
          plan={currentPlan}
          error={modalError}
          onClose={closeModal}
          onSubmit={modalMode === "create" ? createPlan : updatePlan}
          getStats={getStats}
        />
      )}
      {isModalOpen && modalMode === "delete" && (
        <DeletePlanModal
          plan={currentPlan}
          error={modalError}
          onClose={closeModal}
          onDelete={deletePlan}
          getStats={getStats}
        />
      )}
    </div>
  );
}
