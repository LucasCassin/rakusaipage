import React from "react";
import Button from "./Button";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

const PlanListItem = ({ plan }) => {
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
    return `${value} ${unit}s`;
  };

  return (
    <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex-1">
        <p className="font-bold text-gray-800">{plan.name}</p>
        <p className="text-sm text-gray-500">
          {plan.description || "Sem descrição"}
        </p>
      </div>
      <div className="flex items-center gap-6 w-full sm:w-auto">
        <div className="text-left sm:text-right">
          <p className="font-semibold text-lg text-gray-700">
            {formattedValue}
          </p>
          <p className="text-sm text-gray-500">
            {getPeriod(plan.period_unit, plan.period_value)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="small"
            variant="secondary"
            disabled={true}
            aria-label="Editar"
          >
            <FiEdit2 />
          </Button>
          <Button
            size="small"
            variant="secondary"
            disabled={true}
            aria-label="Deletar"
          >
            <FiTrash2 />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanListItem;
