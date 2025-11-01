import React from "react";
import { useFinancialKPIs } from "src/hooks/useFinancialKPIs";
import KPICard from "components/ui/KPICard";
import KPICardSkeleton from "components/ui/KPICardSkeleton";
import Alert from "components/ui/Alert";
import { FiUsers, FiDollarSign, FiClock, FiCheckSquare } from "react-icons/fi";
import FormInput from "components/forms/FormInput"; // <-- 1. IMPORTAR FORM INPUT

// --- 2. CORREÇÃO "MOSTRAR ZERO" ---
const formatCurrency = (value) => {
  const numberValue = parseFloat(value);

  // Se for NaN (ex: "..." ou undefined), retorna "..."
  if (isNaN(numberValue)) {
    return "...";
  }

  // Agora, 0 ou 100.50 serão formatados corretamente
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numberValue);
};
// --- FIM DA CORREÇÃO ---

// --- 3. NOVO COMPONENTE: DateRangeSelectors ---
const DateRangeSelectors = ({ selectedRange, setSelectedRange, disabled }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex-1">
        <label
          htmlFor="startDate"
          className="block text-sm font-medium text-gray-700"
        >
          Data Inicial
        </label>
        <FormInput
          id="startDate"
          name="startDate"
          type="date"
          value={selectedRange.startDate}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1"
        />
      </div>
      <div className="flex-1">
        <label
          htmlFor="endDate"
          className="block text-sm font-medium text-gray-700"
        >
          Data Final
        </label>
        <FormInput
          id="endDate"
          name="endDate"
          type="date"
          value={selectedRange.endDate}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1"
        />
      </div>
    </div>
  );
};
// --- FIM DO NOVO COMPONENTE ---

export default function DashboardKPIs({ user, canFetch }) {
  // Pega os novos estados do hook
  const { kpiData, isLoading, error, selectedRange, setSelectedRange } =
    useFinancialKPIs(user, canFetch);

  // Helper para formatar a data (dd/mm/aaaa)
  const formatDate = (dateString) => {
    if (!dateString) return "...";
    try {
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error("Erro ao formatar data:", e);
      return dateString; // Fallback
    }
  };

  const displayDate = `${formatDate(selectedRange.startDate)} até ${formatDate(selectedRange.endDate)}`;

  return (
    <div className="mt-8">
      {/* --- 4. CABEÇALHO ATUALIZADO --- */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Visão Geral
          </h3>
          <p className="text-sm text-gray-500">
            {isLoading ? "Carregando..." : `Mostrando dados de: ${displayDate}`}
          </p>
        </div>
        {/* Os seletores de data range */}
        <DateRangeSelectors
          selectedRange={selectedRange}
          setSelectedRange={setSelectedRange}
          disabled={isLoading}
        />
      </div>
      {/* --- FIM DA ATUALIZAÇÃO --- */}

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
              title="Receita no Período" // Título genérico
              value={formatCurrency(kpiData.revenueThisMonth)}
              icon={FiDollarSign}
              color="green"
            />
            <KPICard
              title="Pendente no Período" // Título genérico
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
