import React, { useMemo, useEffect } from "react";
import {
  FiX,
  FiBarChart2,
  FiUser,
  FiLayers,
  FiActivity,
  FiTarget,
} from "react-icons/fi";
import Button from "components/ui/Button";
import Image from "next/image";

const StatCardSkeleton = () => (
  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  </div>
);

const SectionSkeleton = () => (
  <div className="space-y-3 mt-2">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  </div>
);

export default function StatsModal({
  presentation,
  loggedInUser,
  onClose,
  isLoading,
}) {
  const stats = useMemo(() => {
    if (!presentation || !presentation.scenes) return null;

    const globalMaxMap = {};
    const userElementsMap = {};
    let userStepsCount = 0;
    const scenesData = [];

    presentation.scenes.forEach((scene) => {
      if (scene.scene_type === "FORMATION") {
        const localCountsMap = {};

        (scene.scene_elements || []).forEach((el) => {
          const typeName = el.element_type_name || el.display_name || "Outros";

          if (typeName === "Palco" || el.element_type_id === "stage-line-id")
            return;

          const icon = el.image_url || el.element_type?.image_url;
          const scale = el.scale || el.element_type?.scale || 1.0;

          if (!localCountsMap[typeName]) {
            localCountsMap[typeName] = { count: 0, icon, scale };
          }
          localCountsMap[typeName].count += 1;

          if (
            loggedInUser &&
            el.assignees &&
            el.assignees.includes(loggedInUser.id)
          ) {
            if (!userElementsMap[typeName]) {
              userElementsMap[typeName] = {
                scenes: new Set(),
                icon,
                scale,
              };
            }
            userElementsMap[typeName].scenes.add(scene.id);
          }
        });

        if (Object.keys(localCountsMap).length > 0) {
          const sortedLocalCounts = Object.entries(localCountsMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.count - a.count);

          scenesData.push({
            id: scene.id,
            name: scene.name,
            order: scene.order,
            counts: sortedLocalCounts,
          });
        }

        Object.entries(localCountsMap).forEach(([typeName, data]) => {
          if (
            !globalMaxMap[typeName] ||
            data.count > globalMaxMap[typeName].count
          ) {
            globalMaxMap[typeName] = {
              count: data.count,
              sceneName: scene.name,
              icon: data.icon,
              scale: data.scale,
            };
          }
        });
      }

      if (scene.scene_type === "TRANSITION") {
        (scene.transition_steps || []).forEach((step) => {
          if (
            loggedInUser &&
            step.assignees &&
            step.assignees.includes(loggedInUser.id)
          ) {
            userStepsCount += 1;
          }
        });
      }
    });

    const sortedGlobalMax = Object.entries(globalMaxMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    const sortedUserElements = Object.entries(userElementsMap)
      .map(([name, data]) => ({ name, ...data, count: data.scenes.size }))
      .sort((a, b) => b.count - a.count);

    return {
      globalMaxUsage: sortedGlobalMax,
      userStats: {
        elements: sortedUserElements,
        stepsCount: userStepsCount,
      },
      sceneStats: scenesData,
    };
  }, [presentation, loggedInUser]);

  const StatItem = ({
    icon,
    title,
    value,
    subtext,
    scale = 1.0,
    highlight = false,
  }) => (
    <div
      className={`flex items-center p-3 rounded-lg border shadow-sm transition-all ${
        highlight
          ? "bg-purple-50 border-purple-100 ring-1 ring-purple-100"
          : "bg-gray-50 border-gray-100"
      }`}
    >
      <div className="w-12 h-12 relative flex-shrink-0 mr-3 bg-white rounded-full border border-gray-200 flex items-center justify-center overflow-hidden">
        {icon ? (
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              transform: `scale(${scale})`,
              transformOrigin: "center",
            }}
          >
            <Image
              src={icon}
              alt={title}
              fill
              className="object-contain p-1.5"
            />
          </div>
        ) : (
          <div className="text-gray-400">
            <FiActivity />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${highlight ? "text-purple-900" : "text-gray-900"}`}
        >
          {title}
        </p>
        <p
          className={`text-xs truncate ${highlight ? "text-purple-700" : "text-gray-500"}`}
        >
          {subtext}
        </p>
      </div>
      <div className="ml-2">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold ${
            highlight
              ? "bg-purple-200 text-purple-800"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {value}
        </span>
      </div>
    </div>
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup para remover o listener quando o modal desmontar
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FiBarChart2 className="text-rakusai-purple" />
            Estatísticas da Apresentação
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-8 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {/* 1. MINHAS ESTATÍSTICAS (Elementos Primeiro, Steps por Último) */}
          <section>
            <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 flex items-center gap-2">
              <FiUser className="text-rakusai-purple" /> Minhas Atribuições
            </h4>

            {isLoading ? (
              <SectionSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* A. Elementos Ordenados */}
                {stats?.userStats.elements.map((data) => (
                  <StatItem
                    key={data.name}
                    title={data.name}
                    icon={data.icon}
                    scale={data.scale}
                    value={data.count}
                    subtext={`Cena(s)`}
                    highlight={true}
                  />
                ))}

                {/* B. Card de Steps (Por Último) */}
                {stats?.userStats.stepsCount > 0 && (
                  <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
                    <div className="w-12 h-12 flex items-center justify-center bg-white text-blue-600 rounded-full border border-blue-100 mr-3 shadow-sm">
                      <FiActivity size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900">
                        Passos de Transição
                      </p>
                      <p className="text-xs text-blue-700">Checklist</p>
                    </div>
                    {/* Aqui */}
                    <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold text-blue-700 bg-blue-100">
                      {stats?.userStats.stepsCount || 0}
                    </span>
                  </div>
                )}

                {stats?.userStats.stepsCount === 0 &&
                  stats?.userStats.elements.length === 0 && (
                    <p className="text-sm text-gray-400 col-span-full italic bg-gray-50 p-3 rounded border border-dashed border-gray-200 text-center">
                      Você não está escalado em nenhuma cena.
                    </p>
                  )}
              </div>
            )}
          </section>

          <div className="border-t border-gray-100 my-2" />

          {/* 2. PICO DE USO (Ordenado) */}
          <section>
            <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 flex items-center gap-2">
              <FiTarget /> Máximo uso Simultâneo
            </h4>
            {isLoading ? (
              <SectionSkeleton />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stats && stats.globalMaxUsage.length > 0 ? (
                  stats.globalMaxUsage.map((data) => (
                    <StatItem
                      key={data.name}
                      title={data.name}
                      icon={data.icon}
                      scale={data.scale}
                      value={data.count}
                      subtext={`Máx. em: ${data.sceneName}`}
                    />
                  ))
                ) : (
                  <p className="text-sm text-gray-400 col-span-full italic">
                    Nenhum elemento posicionado no palco.
                  </p>
                )}
              </div>
            )}
          </section>

          <div className="border-t border-gray-100 my-2" />

          {/* 3. POR CENA (Itens Ordenados) */}
          <section>
            <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3 flex items-center gap-2">
              <FiLayers /> Contagem por Cena
            </h4>
            {isLoading ? (
              <SectionSkeleton />
            ) : (
              <div className="space-y-4">
                {stats && stats.sceneStats.length > 0 ? (
                  stats.sceneStats.map((scene) => (
                    <div
                      key={scene.id}
                      className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                    >
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            {scene.name}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white">
                        {scene.counts.map((data) => (
                          <div
                            key={data.name}
                            className="flex items-center gap-2 p-1.5 border border-gray-100 rounded bg-gray-50/50"
                          >
                            <div className="w-8 h-8 relative flex-shrink-0 bg-white rounded-full border border-gray-100 flex items-center justify-center overflow-hidden">
                              {data.icon && (
                                <div
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    position: "relative",
                                    transform: `scale(${data.scale})`,
                                  }}
                                >
                                  <Image
                                    src={data.icon}
                                    alt={data.name}
                                    fill
                                    className="object-contain p-1"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate">
                                {data.name}
                              </div>
                              <div className="text-[10px] text-gray-400 font-bold">
                                x{data.count}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Nenhuma cena de formação cadastrada.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            size="small"
            className="w-full sm:w-auto"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
