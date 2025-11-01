import React from "react";

// Esqueleto para a tabela de planos
const PlanListSkeleton = ({ rows = 2 }) => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 divide-y divide-gray-200 animate-pulse">
      {[...Array(rows)].map((_, index) => (
        <div key={index} className="p-4 flex justify-between items-center">
          <div className="w-1/3 h-4 bg-gray-300 rounded"></div>
          <div className="w-1/4 h-4 bg-gray-300 rounded"></div>
          <div className="w-1/4 h-4 bg-gray-300 rounded"></div>
          <div className="w-16 h-8 bg-gray-300 rounded-md"></div>
        </div>
      ))}
    </div>
  );
};

export default PlanListSkeleton;
