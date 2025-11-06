import React from "react";
import FormationMap from "./FormationMap"; //
import TransitionChecklist from "./TransitionChecklist"; //
import { FiUsers, FiCalendar, FiMapPin } from "react-icons/fi";

/**
 * Este componente é uma "versão de impressão" escondida da apresentação.
 * Ele é formatado para A4 e renderiza TODAS as cenas.
 */
const PrintablePresentation = React.forwardRef(({ presentation }, ref) => {
  if (!presentation) return null;

  return (
    // Escondido na tela, visível apenas na impressão
    <div ref={ref} className="hidden print:block p-8 font-sans">
      {/* Cabeçalho */}
      <div className="border-b-2 border-gray-900 pb-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          {presentation.name}
        </h1>
        <div className="flex items-center gap-6 mt-2 text-gray-600">
          {presentation.date && (
            <span className="flex items-center gap-2">
              <FiCalendar />
              {new Date(presentation.date).toLocaleDateString("pt-BR", {
                timeZone: "UTC",
              })}
            </span>
          )}
          {presentation.location && (
            <span className="flex items-center gap-2">
              <FiMapPin />
              {presentation.location}
            </span>
          )}
        </div>
      </div>

      {/* Roteiro (Loop em TODAS as cenas) */}
      <div className="space-y-10">
        {presentation.scenes.map((scene) => (
          <div key={scene.id} className="page-break-inside-avoid">
            {/* Título da Cena */}
            <h2 className="text-2xl font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2">
              {`${scene.order + 1}. ${scene.name}`}
              <span className="ml-3 text-sm font-normal text-gray-500">
                ({scene.scene_type === "FORMATION" ? "Formação" : "Transição"})
              </span>
            </h2>

            {/* Descrição da Cena (se houver) */}
            {scene.description && (
              <p className="mb-4 italic text-gray-600">{scene.description}</p>
            )}

            {/* Renderiza o Mapa ou a Checklist (em modo "leitura") */}
            {scene.scene_type === "FORMATION" ? (
              <FormationMap
                elements={scene.scene_elements}
                loggedInUser={null} // Sem destaque
                isEditorMode={false} // Sem modo editor
              />
            ) : (
              <TransitionChecklist
                steps={scene.transition_steps}
                loggedInUser={null} // Sem destaque
                isEditorMode={false} // Sem modo editor
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

PrintablePresentation.displayName = "PrintablePresentation";
export default PrintablePresentation;
