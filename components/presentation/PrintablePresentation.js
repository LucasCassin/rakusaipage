// lucascassin/rakusaipage/rakusaipage-stage-map/components/presentation/PrintablePresentation.js

import React from "react";
import FormationMap from "./FormationMap";
import TransitionChecklist from "./TransitionChecklist";
import { FiUsers, FiCalendar, FiMapPin } from "react-icons/fi";

const PrintablePresentation = React.forwardRef(({ presentation }, ref) => {
  if (!presentation) return null;

  return (
    <div
      ref={ref}
      // ADIÇÃO: '[print-color-adjust:exact]' força a impressão de cores e backgrounds
      className="fixed left-[-9999px] top-[-9999px] w-[210mm] print:static print:w-auto print:block p-8 font-sans bg-white text-black [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
    >
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

      {/* Roteiro */}
      <div className="space-y-10">
        {presentation.scenes.map((scene) => (
          <div
            key={scene.id}
            className="page-break-inside-avoid break-inside-avoid"
          >
            {/* Título da Cena */}
            <h2 className="text-2xl font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2">
              {`${scene.order + 1}. ${scene.name}`}
              <span className="ml-3 text-sm font-normal text-gray-500">
                ({scene.scene_type === "FORMATION" ? "Formação" : "Transição"})
              </span>
            </h2>

            {scene.description && (
              <p className="mb-4 italic text-gray-600">{scene.description}</p>
            )}

            {/* LÓGICA CORRIGIDA AQUI */}
            {scene.scene_type === "FORMATION" ? (
              // Wrapper com altura fixa e borda para delimitar o palco na impressão
              <div className="w-full h-[500px] relative border-2 border-gray-800 rounded-lg overflow-hidden bg-gray-50">
                <FormationMap
                  elements={scene.scene_elements}
                  loggedInUser={null}
                  isEditorMode={false}
                />
              </div>
            ) : (
              <TransitionChecklist
                steps={scene.transition_steps}
                loggedInUser={null}
                isEditorMode={false}
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
