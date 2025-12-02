import React, { useState } from "react"; // Adicione useState
import { usePaymentPlans } from "src/hooks/usePaymentPlans";
import PlanListItem from "components/ui/PlanListItem";
import PlanListSkeleton from "components/ui/PlanListSkeleton";
import Button from "components/ui/Button";
import Alert from "components/ui/Alert";
import PlanFormModal from "components/finance/PlanFormModal";
import DeletePlanModal from "components/finance/DeletePlanModal";
import PlanUsersModal from "components/finance/PlanUsersModal"; // <--- Importe aqui

export default function PlanManagement({ user, canFetch }) {
  // Estado local para controlar o modal de usuários
  const [managingPlan, setManagingPlan] = useState(null);

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
    getPlanStats: getStats,
  } = usePaymentPlans(user, canFetch);

  return (
    <div className="my-20 border-t border-gray-200 pt-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Planos de Pagamento
        </h3>
        <Button
          variant="primary"
          size="small"
          className="w-full sm:w-auto" // Garante largura total no mobile
          onClick={() => openModal("create")}
        >
          + Criar Novo Plano
        </Button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="flex flex-col gap-2">
        {isLoading ? (
          <PlanListSkeleton />
        ) : plans.length > 0 ? (
          plans.map((plan) => (
            <div key={plan.id} className="relative">
              <PlanListItem
                plan={plan}
                onEditClick={() => openModal("edit", plan)}
                onDeleteClick={() => openModal("delete", plan)}
                onStatsClick={() => setManagingPlan(plan)}
              />
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 p-8">
            Nenhum plano de pagamento criado.
          </p>
        )}
      </div>

      {/* Modais Existentes */}
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

      {/* Novo Modal de Gestão de Usuários */}
      {managingPlan && (
        <PlanUsersModal
          plan={managingPlan}
          onClose={() => setManagingPlan(null)}
        />
      )}
    </div>
  );
}
