import React from "react";
import { useFinancialKPIs } from "src/hooks/useFinancialKPIs";
import KPICard from "components/ui/KPICard";
import KPICardSkeleton from "components/ui/KPICardSkeleton";
import Alert from "components/ui/Alert";
import { FiUsers, FiDollarSign, FiClock, FiCheckSquare } from "react-icons/fi";

// Helper para formatar moeda
const formatCurrency = (value) => {
  if (typeof value !== "number") {
    // Retorna "..." se os dados ainda não chegaram (para evitar R$ 0,00)
    return isNaN(parseFloat(value))
      ? "..."
      : new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(value);
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function DashboardKPIs({ user, canFetch }) {
  const { kpiData, isLoading, error } = useFinancialKPIs(user, canFetch);

  return (
    <div className="mt-8">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        Visão Geral
      </h3>
      {error && <Alert type="error">{error}</Alert>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : (
          <>
            <KPICard
              title="Alunos Ativos"
              value={kpiData.activeStudents}
              icon={FiUsers}
              color="blue"
            />
            <KPICard
              title="Receita do Mês"
              value={formatCurrency(kpiData.revenueThisMonth)}
              icon={FiDollarSign}
              color="green"
            />
            <KPICard
              title="Pendente no Mês"
              value={formatCurrency(kpiData.pendingThisMonth)}
              icon={FiClock}
              color="yellow"
            />
            <KPICard
              title="Aguardando Confirmação"
              value={kpiData.awaitingConfirmation}
              icon={FiCheckSquare}
              color="purple"
            />
          </>
        )}
      </div>
    </div>
  );
}
