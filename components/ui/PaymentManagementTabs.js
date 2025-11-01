import React from "react";

const PaymentManagementTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "awaiting_confirmation", label: "Aguardando Confirmação" },
    { id: "pending_overdue", label: "Pendentes e Atrasados" },
    { id: "history", label: "Histórico Completo" },
  ];

  return (
    <div className="border-b border-gray-200">
      {/* --- ATUALIZAÇÃO APLICADA AQUI --- */}
      <nav
        className="-mb-px flex space-x-6 max-w-full overflow-x-auto 
                   pb-2 scrollbar-thin scrollbar-thumb-gray-300 
                   scrollbar-track-gray-100 scrollbar-thumb-rounded-full"
        aria-label="Tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${
              activeTab === tab.id
                ? "border-rakusai-purple text-rakusai-purple"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {/* --- FIM DA ATUALIZAÇÃO --- */}
    </div>
  );
};

export default PaymentManagementTabs;
