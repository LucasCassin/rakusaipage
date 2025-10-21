import React from "react";

const KPICardSkeleton = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 animate-pulse flex items-center gap-5">
      {/* Círculo para o ícone */}
      <div className="w-12 h-12 rounded-full bg-gray-300 flex-shrink-0"></div>
      {/* Linhas de texto */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-8 bg-gray-300 rounded w-1/2"></div>
      </div>
    </div>
  );
};

export default KPICardSkeleton;
