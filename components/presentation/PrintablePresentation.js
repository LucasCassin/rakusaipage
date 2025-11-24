import React from "react";
import FormationMap from "./FormationMap";
import TransitionChecklist from "./TransitionChecklist";
import { FiCalendar, FiMapPin, FiClock, FiNavigation } from "react-icons/fi";

const PrintablePresentation = React.forwardRef(
  ({ presentation, finalComments, isCompact }, ref) => {
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

    const formationScenes = presentation.scenes.filter(
      (s) => s.scene_type === "FORMATION",
    );
    const transitionScenes = presentation.scenes.filter(
      (s) => s.scene_type !== "FORMATION",
    );

    return (
      <div
        ref={ref}
        className={`fixed left-[-9999px] top-[-9999px] print:static print:w-full print:block font-sans font-sans bg-white text-black [print-color-adjust:exact] [-webkit-print-color-adjust:exact]
          ${isCompact ? "w-[297mm] p-[10mm]" : "w-[210mm] p-[15mm]"}
          `}
        style={{
          fontFamily:
            "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* 2. @page com margem 0 remove cabeçalho/rodapé do navegador */}
        <style type="text/css" media="print">
          {`
          @page { 
            size: ${isCompact ? "landscape" : "A4"}; 
            margin: 0; 
          }
          body { 
            margin: 0; 
            font-family: var(--font-poppins), sans-serif !important;
          }
        `}
        </style>
        {isCompact ? (
          <div className="h-full flex flex-col">
            {/* 1. Cabeçalho Super Compacto */}
            <div className="mb-4 border-b-2 border-black pb-1 flex justify-between items-end">
              <div>
                <h1 className="font-bold text-lg uppercase leading-none text-black">
                  {presentation.name}
                </h1>
                <div className="flex gap-3 text-xs text-gray-700 mt-1 font-medium">
                  {formattedDate && <span>{formattedDate}</span>}
                  {presentation.location && (
                    <span>• {presentation.location}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Conteúdo em Colunas (Masonry Flow com Linha Divisória) */}
            <div
              style={{
                columnCount: 3,
                columnGap: "2rem",
                columnRule: "1px solid black",
                width: "100%",
              }}
            >
              {/* --- BLOCO A: FORMAÇÕES --- */}
              {formationScenes.map((scene, idx) => (
                <div key={scene.id} className="mb-6 break-inside-avoid">
                  {/* Título Compacto */}
                  <h3 className="font-bold text-sm text-black mb-1 leading-tight">
                    {idx + 1}. {scene.name}
                  </h3>

                  {/* Mapa Limpo (Sem borda, fundo branco, altura reduzida) */}
                  <div className="w-full h-[160px] relative overflow-hidden bg-white">
                    <FormationMap
                      elements={scene.scene_elements}
                      loggedInUser={null}
                      isEditorMode={false}
                    />
                  </div>
                </div>
              ))}

              {/* --- DIVISÓRIA (Se houver transições) --- */}
              {formationScenes.length > 0 && transitionScenes.length > 0 && (
                <div className="break-inside-avoid py-4 mt-2">
                  <div className="border-t-2 border-black w-full"></div>
                  <h4 className="mt-2 font-bold text-xs uppercase mb-1 text-black">
                    Transições
                  </h4>
                </div>
              )}

              {/* --- BLOCO B: TRANSIÇÕES --- */}
              {transitionScenes.map((scene) => (
                <div key={scene.id} className="mb-3">
                  {/* Título da Transição (Pode quebrar se necessário, mas tentamos manter com o 1º item) */}
                  <h3 className="font-bold text-xs text-black mb-0.5 break-after-avoid">
                    {scene.order + 1}. {scene.name}
                  </h3>

                  {/* Lista Compacta (Sem bullets grandes, texto pequeno) */}
                  <div className="text-[10px] leading-tight text-gray-800 ml-1">
                    {scene.transition_steps.map((step, i) => (
                      <div key={step.id} className="mb-0.5 flex">
                        <span className="mr-1 opacity-70">-</span>
                        <span>{step.description}</span>
                      </div>
                    ))}
                    {scene.transition_steps.length === 0 && (
                      <span className="text-gray-400 italic text-[9px]">
                        - Direto
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* --- DIVISÓRIA (Se houver comentários) --- */}
              {finalComments && (
                <div className="break-inside-avoid py-4 mt-2">
                  <div className="border-t-2 border-black w-full"></div>
                </div>
              )}

              {/* --- BLOCO C: COMENTÁRIOS FINAIS --- */}
              {finalComments && (
                <div className="break-inside-avoid">
                  <h4 className="font-bold text-xs uppercase mb-1 text-black">
                    Notas Finais
                  </h4>
                  <p className="text-[11px] whitespace-pre-wrap leading-snug text-gray-900">
                    {finalComments}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
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
                      <span className="text-gray-700">
                        {presentation.location}
                      </span>
                    </div>
                  </div>
                )}
                {formattedMeetTime && (
                  <div className="flex items-start gap-3">
                    <FiClock className="h-5 w-5 text-gray-600 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-800 block">
                        Encontro
                      </span>
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
                const isFormation = scene.scene_type === "FORMATION";

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
                      <p className="mb-4 italic text-gray-600">
                        {scene.description}
                      </p>
                    )}

                    {isFormation ? (
                      <div className="w-full h-[500px] relative border-2 border-gray-800 rounded-lg overflow-hidden bg-gray-50 print:bg-white">
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
                );
              })}
            </div>
            {finalComments && (
              <div className="mt-12 pt-6 border-t-4 border-gray-800 break-inside-avoid page-break-inside-avoid">
                <h3 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-wider">
                  Notas / Observações Finais
                </h3>
                <div className="p-6 bg-gray-100 border border-gray-300 rounded-lg">
                  <p className="text-lg text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                    {finalComments}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

PrintablePresentation.displayName = "PrintablePresentation";
export default PrintablePresentation;
