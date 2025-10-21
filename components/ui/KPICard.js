import React from "react";

const KPICard = ({ title, value, icon: Icon, color = "gray" }) => {
  // Mapeamento de cores para os estilos do Tailwind CSS
  const colorStyles = {
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    green: { bg: "bg-green-100", text: "text-green-600" },
    yellow: { bg: "bg-yellow-100", text: "text-yellow-600" },
    purple: { bg: "bg-rakusai-purple-light", text: "text-rakusai-purple" }, // Supondo que você tenha essa cor no seu tema
    gray: { bg: "bg-gray-100", text: "text-gray-600" },
  };

  const selectedColor = colorStyles[color] || colorStyles.gray;

  return (
    <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center gap-5 transform hover:-translate-y-1 transition-transform duration-300">
      {Icon && (
        <div
          className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-full ${selectedColor.bg}`}
        >
          <Icon className={`h-7 w-7 ${selectedColor.text}`} />
        </div>
      )}
      <div>
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          {title}
        </h3>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
};

export default KPICard;
