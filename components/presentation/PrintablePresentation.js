import React, { useMemo } from "react";
import FormationMap from "./FormationMap";
import { FiCalendar, FiMapPin, FiClock, FiNavigation } from "react-icons/fi";

// Ajuste a porcentagem aqui para alterar a divisão da tela
const MAP_WIDTH = "75%"; // Largura do Mapa
const TRANSITIONS_WIDTH = "25%"; // Largura da lista de Transições

const PrintablePresentation = React.forwardRef(
  ({ presentation, finalComments, isCompact }, ref) => {
    // --- Formatadores de Data ---
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
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    // --- Lógica para MODO COMPACTO ---
    const formationScenes = presentation.scenes.filter(
      (s) => s.scene_type === "FORMATION",
    );
    const transitionScenes = presentation.scenes.filter(
      (s) => s.scene_type !== "FORMATION",
    );

    // --- Lógica para MODO DETALHADO (Agrupamento) ---
    const detailedPages = useMemo(() => {
      if (isCompact) return [];

      const groupedPages = [];
      let currentTransitions = [];
      let formationIndex = 1;

      presentation.scenes.forEach((scene) => {
        if (scene.scene_type === "FORMATION") {
          groupedPages.push({
            type: "FORMATION_PAGE",
            formation: scene,
            transitions: [...currentTransitions],
            index: formationIndex,
          });
          formationIndex++;
          currentTransitions = [];
        } else {
          currentTransitions.push(scene);
        }
      });
      return groupedPages;
    }, [presentation.scenes, isCompact]);

    const setlist = presentation.scenes.filter(
      (s) => s.scene_type === "FORMATION",
    );

    if (!presentation) return null;

    return (
      <div
        ref={ref}
        className={`fixed left-[-9999px] top-[-9999px] print:static print:w-full print:block font-sans bg-white text-black [print-color-adjust:exact] [-webkit-print-color-adjust:exact]
          ${isCompact ? "w-[297mm] p-[10mm]" : "w-[297mm] p-0"} 
          `}
        style={{
          fontFamily:
            "'Poppins', var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <style type="text/css" media="print">
          {`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

          @page {
            size: A4 landscape; 
            margin: 0; 
          }
          body { 
            margin: 0; 
            font-family: 'Poppins', sans-serif !important;
            -webkit-print-color-adjust: exact;
            width: 100%;
          }
          .page-break {
            break-after: page;
            page-break-after: always;
          }
        `}
        </style>

        {/* =================================================================================
            MODO COMPACTO
           ================================================================================= */}
        {isCompact ? (
          <div className="h-full flex flex-col">
            {/* Cabeçalho Compacto com Info Extra */}
            <div className="mb-4 border-b-2 border-black pb-2">
              <h1 className="font-bold text-lg uppercase leading-none text-black mb-2">
                {presentation.name}
              </h1>

              <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-gray-800">
                {/* Grupo Apresentação */}
                <div className="flex items-center gap-1">
                  <span className="font-bold uppercase text-[10px] text-gray-600 tracking-wider">
                    Apresentação:
                  </span>
                  {presentation.location && (
                    <span>{presentation.location}</span>
                  )}
                  {formattedDate && <span>| {formattedDate}</span>}
                </div>

                {/* Grupo Encontro (Só aparece se existir) */}
                {(formattedMeetTime || presentation.meet_location) && (
                  <div className="flex items-center gap-1">
                    <span className="font-bold uppercase text-[10px] text-gray-600 tracking-wider">
                      Encontro:
                    </span>
                    {presentation.meet_location && (
                      <span>{presentation.meet_location}</span>
                    )}
                    {formattedMeetTime && <span>| {formattedMeetTime}</span>}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                columnCount: 3,
                columnGap: "2rem",
                columnRule: "1px solid black",
                width: "100%",
              }}
            >
              {formationScenes.map((scene, idx) => (
                <div key={scene.id} className="mb-6 break-inside-avoid">
                  <h3 className="font-bold text-sm text-black mb-1 leading-tight">
                    {idx + 1}. {scene.name}
                  </h3>
                  <div className="w-full h-[160px] relative overflow-hidden bg-white">
                    <FormationMap
                      elements={scene.scene_elements}
                      loggedInUser={null}
                      isEditorMode={false}
                    />
                  </div>
                </div>
              ))}

              {formationScenes.length > 0 && transitionScenes.length > 0 && (
                <div className="break-inside-avoid py-4 mt-2">
                  <div className="border-t-2 border-black w-full"></div>
                  <h4 className="mt-2 font-bold text-xs uppercase mb-1 text-black">
                    Transições
                  </h4>
                </div>
              )}

              {transitionScenes.map((scene, idx) => (
                <div key={scene.id} className="mb-3">
                  <h3 className="font-bold text-xs text-black mb-0.5 break-after-avoid">
                    {idx + 1}. {scene.name}
                  </h3>
                  <div className="text-[10px] leading-tight text-gray-800 ml-1">
                    {scene.transition_steps.map((step) => (
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

              {finalComments && (
                <div className="break-inside-avoid py-4 mt-2">
                  <div className="border-t-2 border-black w-full"></div>
                </div>
              )}

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
          /* =================================================================================
             MODO DETALHADO
             ================================================================================= */
          <>
            {/* PÁGINA 1: CAPA */}
            <div className="w-[297mm] h-[210mm] relative flex flex-col page-break bg-white p-[10mm]">
              <div className="flex-1 flex flex-col justify-center items-center p-10">
                <div className="bg-gray-800 p-12 rounded-2xl mb-8 shadow-xl flex items-center justify-center">
                  <img
                    src="/images/logoColoridoV2.svg"
                    alt="Rakusai Logo"
                    className="h-40 w-auto object-contain"
                  />
                </div>

                <h1 className="text-4xl font-bold uppercase tracking-widest text-gray-900 mb-2">
                  {presentation.name}
                </h1>
                {presentation.description && (
                  <p className="text-xl text-gray-600 italic mb-8 max-w-2xl text-center">
                    {presentation.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-8 text-left bg-gray-50 p-6 rounded-lg border border-gray-200 min-w-[500px]">
                  <div className="space-y-3 border-r border-gray-300 pr-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Apresentação
                    </h3>
                    {formattedDate && (
                      <div className="flex items-center gap-3">
                        <FiCalendar className="text-rakusai-purple text-xl" />
                        <span className="text-lg text-gray-800">
                          {formattedDate}
                        </span>
                      </div>
                    )}
                    {presentation.location && (
                      <div className="flex items-center gap-3">
                        <FiMapPin className="text-rakusai-purple text-xl" />
                        <span className="text-lg text-gray-700">
                          {presentation.location}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pl-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Encontro / Saída
                    </h3>
                    {formattedMeetTime ? (
                      <div className="flex items-center gap-3">
                        <FiClock className="text-blue-600 text-xl" />
                        <span className="text-lg text-gray-800">
                          {formattedMeetTime}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">
                        Horário não definido
                      </span>
                    )}

                    {presentation.meet_location && (
                      <div className="flex items-center gap-3">
                        <FiNavigation className="text-blue-600 text-xl" />
                        <span className="text-lg text-gray-700">
                          {presentation.meet_location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PÁGINAS DE FORMAÇÃO */}
            {detailedPages.map((pageData) => (
              <div
                key={pageData.formation.id}
                className="w-[297mm] h-[210mm] page-break flex flex-col p-[10mm] box-border relative"
              >
                <div className="h-[10%] flex flex-col justify-center border-b-2 border-gray-800 mb-2 pb-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-gray-900 leading-none">
                      {pageData.index}.
                    </span>
                    <h2 className="text-3xl font-bold text-gray-800 uppercase truncate">
                      {pageData.formation.name}
                    </h2>
                  </div>
                  {pageData.formation.description && (
                    <p className="text-gray-600 text-sm mt-1 ml-1 truncate italic">
                      {pageData.formation.description}
                    </p>
                  )}
                </div>

                <div className="h-[90%] flex flex-row gap-4">
                  <div
                    style={{ width: MAP_WIDTH }}
                    className="h-full relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50"
                  >
                    <FormationMap
                      elements={pageData.formation.scene_elements}
                      loggedInUser={null}
                      isEditorMode={false}
                    />
                  </div>

                  <div
                    style={{ width: TRANSITIONS_WIDTH }}
                    className="h-full bg-white border border-gray-200 rounded-lg p-3 flex flex-col overflow-hidden"
                  >
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider pb-1 border-b border-gray-100">
                      Transições
                    </h4>

                    {pageData.transitions.length > 0 ? (
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {pageData.transitions.map((trans) => (
                          <div
                            key={trans.id}
                            className="border-l-4 border-gray-300 pl-2"
                          >
                            <div className="mb-1">
                              <h5 className="font-bold text-sm text-gray-800 leading-tight">
                                {trans.name}
                              </h5>
                              {trans.description && (
                                <p className="text-[10px] text-gray-500 italic mt-0.5 leading-tight">
                                  {trans.description}
                                </p>
                              )}
                            </div>
                            <ul className="list-none space-y-1">
                              {trans.transition_steps.length > 0 ? (
                                trans.transition_steps.map((step) => (
                                  <li
                                    key={step.id}
                                    className="text-[11px] text-gray-700 flex items-start leading-snug"
                                  >
                                    <span className="mr-1.5 mt-1 min-w-[4px] h-[4px] bg-gray-400 rounded-full block"></span>
                                    <span>{step.description}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-[10px] text-gray-400 italic pl-1">
                                  Direto (sem passos)
                                </li>
                              )}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                        <p className="text-sm font-semibold text-gray-400">
                          Sem transição
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* PÁGINA FINAL */}
            <div className="w-[297mm] h-[210mm] p-[15mm] flex flex-col justify-center box-border">
              <h1 className="text-3xl font-bold text-gray-900 mb-8 pb-4 border-b-2 border-gray-200 uppercase">
                Resumo Final
              </h1>

              <div className="flex gap-10 h-full">
                <div className="w-1/2 pr-6 border-r border-gray-200">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    Ordem das músicas
                  </h3>
                  <ul className="space-y-4">
                    {setlist.map((scene, idx) => (
                      <li key={scene.id} className="flex items-center text-lg">
                        <span className="font-bold text-gray-400 w-8 text-right mr-4">
                          {idx + 1}.
                        </span>
                        <span className="font-semibold text-gray-800">
                          {scene.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="w-1/2 pl-4">
                  <h3 className="text-xl font-bold text-gray-700 mb-6">
                    Observações Finais
                  </h3>
                  {finalComments ? (
                    <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-100 text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">
                      {finalComments}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">
                      Nenhuma observação final registrada.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  },
);

PrintablePresentation.displayName = "PrintablePresentation";
export default PrintablePresentation;
