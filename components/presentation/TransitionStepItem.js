import React from "react";
import { FiCheck } from "react-icons/fi"; // Um ícone para a checklist

/**
 * Renderiza um único item da "checklist" de transição.
 * Contém a lógica de "Destaque".
 */
export default function TransitionStepItem({ step, loggedInUser }) {
  // A "Mágica do Destaque"
  const isHighlighted =
    loggedInUser && step.assigned_user_id === loggedInUser.id;

  // O 'findDeepById' já nos deu o 'assigned_user_id' e 'description'.
  // Vamos buscar o nome do usuário associado (precisamos ajustar o 'findDeepById' para isso no futuro).

  // O CSS de Destaque
  const highlightClasses = isHighlighted
    ? "bg-rakusai-pink-light bg-opacity-20 border-l-4 border-rakusai-pink"
    : "bg-white";

  return (
    <div
      className={`flex items-start p-4 space-x-3 ${highlightClasses} transition-colors duration-300`}
    >
      {/* O Número da Ordem */}
      <span className="flex items-center justify-center w-6 h-6 font-bold text-gray-500 bg-gray-100 rounded-full flex-shrink-0">
        {step.order + 1}
      </span>

      {/* A Descrição */}
      <div className="flex-1">
        <p className="text-gray-800">{step.description}</p>

        {/* Mostra quem está destacado (opcional, mas bom para UX) */}
        {isHighlighted && (
          <span className="text-xs font-semibold text-rakusai-pink">
            (Sua responsabilidade)
          </span>
        )}
      </div>
    </div>
  );
}
