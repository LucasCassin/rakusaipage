// lucascassin/rakusaipage/rakusaipage-stage-map/components/presentation/PrintablePresentation.js

import React from "react";
import FormationMap from "./FormationMap";
import TransitionChecklist from "./TransitionChecklist";
import { FiCalendar, FiMapPin, FiClock, FiNavigation } from "react-icons/fi";

const PrintablePresentation = React.forwardRef(({ presentation }, ref) => {
  if (!presentation) return null;

  const formattedDate = presentation.date
    ? new Date(presentation.date).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const formattedMeetTime = presentation.meet_time
    ? new Date(presentation.meet_time).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      ref={ref}
      // 1. Padding manual (p-[15mm]) substitui a margem da página para controlar o conteúdo
      className="fixed left-[-9999px] top-[-9999px] w-[210mm] print:static print:w-full print:block font-sans font-sans bg-white text-black p-[15mm] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
      style={{
        fontFamily: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* 2. @page com margem 0 remove cabeçalho/rodapé do navegador */}
      <style type="text/css" media="print">
        {`
          @page { 
            size: A4; 
            margin: 0; 
          }
          body { 
            margin: 0;
            font-family: var(--font-poppins), sans-serif !important;
          }
        `}
      </style>

      {/* Cabeçalho do Documento */}
      <div className="border-b-2 border-gray-900 pb-6 mb-8 break-inside-avoid">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {presentation.name}
        </h1>

        {presentation.description && (
          <p className="text-lg text-gray-600 mb-6 italic">
            {presentation.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
          {formattedDate && (
            <div className="flex items-start gap-3">
              <FiCalendar className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <span className="font-bold text-gray-800 block">
                  Data do Evento
                </span>
                <span className="text-gray-700">{formattedDate}</span>
              </div>
            </div>
          )}
          {presentation.location && (
            <div className="flex items-start gap-3">
              <FiMapPin className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <span className="font-bold text-gray-800 block">
                  Local do Evento
                </span>
                <span className="text-gray-700">{presentation.location}</span>
              </div>
            </div>
          )}
          {formattedMeetTime && (
            <div className="flex items-start gap-3">
              <FiClock className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <span className="font-bold text-gray-800 block">Encontro</span>
                <span className="text-gray-700">{formattedMeetTime}</span>
              </div>
            </div>
          )}
          {presentation.meet_location && (
            <div className="flex items-start gap-3">
              <FiNavigation className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <span className="font-bold text-gray-800 block">
                  Local de Encontro
                </span>
                <span className="text-gray-700">
                  {presentation.meet_location}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Cenas */}
      <div className="space-y-8">
        {presentation.scenes.map((scene) => {
          // 3. Lógica de Quebra de Página Condicional
          const isFormation = scene.scene_type === "FORMATION";

          // Formação: break-inside-avoid (Não quebra o mapa)
          // Transição: permite quebra (remove a classe avoid)
          const breakClass = isFormation
            ? "page-break-inside-avoid break-inside-avoid"
            : "";

          return (
            <div key={scene.id} className={`pt-4 ${breakClass}`}>
              {/* Título: 'break-after-avoid' tenta manter o título junto com o começo do conteúdo */}
              <h2 className="text-2xl font-bold text-gray-800 mb-3 border-b border-gray-300 pb-2 break-after-avoid">
                {`${scene.order + 1}. ${scene.name}`}
                <span className="ml-3 text-sm font-normal text-gray-500">
                  ({isFormation ? "Formação" : "Transição"})
                </span>
              </h2>

              {scene.description && (
                <p className="mb-4 italic text-gray-600">{scene.description}</p>
              )}

              {isFormation ? (
                // Mapa de Palco (Fixo)
                <div className="w-full h-[500px] relative border-2 border-gray-800 rounded-lg overflow-hidden bg-gray-50 print:bg-white">
                  <FormationMap
                    elements={scene.scene_elements}
                    loggedInUser={null}
                    isEditorMode={false}
                  />
                </div>
              ) : (
                // Checklist de Transição (Fluida, pode quebrar página)
                <TransitionChecklist
                  steps={scene.transition_steps}
                  loggedInUser={null}
                  isEditorMode={false}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

PrintablePresentation.displayName = "PrintablePresentation";
export default PrintablePresentation;
