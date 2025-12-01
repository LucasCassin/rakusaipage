import React from "react";
import Button from "./Button";
import { FiEdit2, FiTrash2, FiBarChart2 } from "react-icons/fi";

// Recebe as novas props 'onEditClick' e 'onDeleteClick'
const PlanListItem = ({ plan, onEditClick, onDeleteClick, onStatsClick }) => {
  const formattedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(plan.full_value);

  const getPeriod = (unit, value) => {
    if (value === 1) {
      return { day: "Diário", week: "Semanal", month: "Mensal", year: "Anual" }[
        unit
      ];
    }
    // Pequena correção: "meses" em vez de "months"
    const unitMap = {
      day: "dias",
      week: "semanas",
      month: "meses",
      year: "anos",
    };
    return `${value} ${unitMap[unit] || unit}`;
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-white grid grid-cols-2 sm:flex sm:justify-between sm:items-center gap-4">
      {/* --- Bloco 1: Título e Descrição --- */}
      {/* Mobile: Topo Esquerda (col-span-1). Desktop: Flex-1 (ocupa espaço restante) */}
      <div className="col-span-1 sm:flex-1 text-left">
        <p className="font-bold text-gray-800">{plan.name}</p>
        <p className="text-sm text-gray-500">
          {plan.description || "Sem descrição"}
        </p>
      </div>

      {/* --- Bloco 2: Valor e Período --- */}
      {/* Mobile: Topo Direita (col-span-1). Desktop: Mantém alinhamento à direita com margem para separar dos botões */}
      <div className="col-span-1 text-right sm:text-right sm:mr-6">
        <p className="font-semibold text-lg text-gray-700">{formattedValue}</p>
        <p className="text-sm text-gray-500">
          {getPeriod(plan.period_unit, plan.period_value)}
        </p>
      </div>

      {/* --- Bloco 3: Botões --- */}
      {/* Mobile: Ocupa largura total (col-span-2) e empilha (flex-col). Desktop: Linha (flex-row) */}
      <div className="col-span-2 flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {/* Botão Editar: Ordem 1 em ambos */}
        <Button
          size="small"
          variant="secondary"
          onClick={onEditClick}
          aria-label="Editar"
          className="w-full sm:w-auto justify-center" // w-full no mobile
        >
          <FiEdit2 />
          {/* Texto visível apenas no mobile */}
          <span className="ml-2 sm:hidden">Editar</span>
        </Button>

        {/* Botão Estatísticas */}
        {/* Mobile: Ordem 2. Desktop: Ordem 3 (último, como estava antes) */}
        <Button
          size="small"
          variant="secondary"
          onClick={onStatsClick}
          aria-label="Estatísticas"
          className="w-full sm:w-auto justify-center order-2 sm:order-3"
        >
          <FiBarChart2 />
          <span className="ml-2 sm:hidden">Estatísticas</span>
        </Button>

        {/* Botão Excluir */}
        {/* Mobile: Ordem 3. Desktop: Ordem 2 (meio, como estava antes) */}
        <Button
          size="small"
          variant="secondary"
          onClick={onDeleteClick}
          aria-label="Deletar"
          className="w-full sm:w-auto justify-center order-3 sm:order-2"
        >
          <FiTrash2 />
          <span className="ml-2 sm:hidden">Excluir</span>
        </Button>
      </div>
    </div>
  );
};

export default PlanListItem;
