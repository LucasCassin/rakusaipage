import React from "react";
import ComunicadoCard from "./ComunicadoCard";

// MUDANÇA: O componente agora recebe 'visibleComunicados' diretamente como prop
export default function ComunicadosSection({ visibleComunicados }) {
  return (
    <div id="comunicados">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Mural de Avisos</h2>
      <div className="space-y-6">
        {visibleComunicados && visibleComunicados.length > 0 ? (
          visibleComunicados.map((com, index) => (
            <ComunicadoCard key={index} comunicado={com} />
          ))
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-sm text-center text-gray-500">
            <p>Nenhum comunicado no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
