import React from "react";
import {
  BellIcon,
  BellAlertIcon,
  AcademicCapIcon,
  BookmarkIcon,
} from "@heroicons/react/24/solid";

// Componente para o card de comunicado
export default function ComunicadoCard({ comunicado }) {
  // Mapeamento de 'Assunto' para ícone e cor
  const subjectMap = {
    Geral: {
      icon: <BellIcon className="w-6 h-6 text-gray-400" />,
      color: "border-gray-300",
    },
    Treino: {
      icon: <AcademicCapIcon className="w-6 h-6 text-rakusai-purple-light" />,
      color: "border-rakusai-purple-light",
    },
    Apresentação: {
      icon: <BookmarkIcon className="w-6 h-6 text-rakusai-pink-light" />,
      color: "border-rakusai-pink-light",
    },
    Urgente: {
      icon: <BellAlertIcon className="w-6 h-6 text-red-600 animate-pulse" />,
      color: "border-red-600",
    },
  };

  const { icon, color } = subjectMap[comunicado.subject] || subjectMap["Geral"];

  return (
    <div
      className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${color} flex items-start gap-4`}
    >
      <div className="flex-shrink-0 mt-1">{icon}</div>
      <div>
        <h3 className="text-xl font-bold text-gray-800">{comunicado.title}</h3>
        <div
          className="prose mt-2 text-gray-600"
          dangerouslySetInnerHTML={{ __html: comunicado.description }}
        />
      </div>
    </div>
  );
}
