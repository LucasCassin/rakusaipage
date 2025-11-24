import React from "react";
import PaletteItem from "./PaletteItem";
import PaletteSection from "./PaletteSection";
import KPICardSkeleton from "components/ui/KPICardSkeleton";
import { FiX } from "react-icons/fi";

/**
 * A "Paleta Inteligente"
 */
export default function EditorPalette({
  palette,
  isPaletteOpen,
  onTogglePalette,
}) {
  const {
    pool = [],
    elementTypes = [],
    isLoading,
    openSections,
    toggleSection,
  } = palette;

  const activeSections = openSections || { pool: true, catalog: false };
  const safeToggle = toggleSection || (() => {});

  if (isLoading) {
    return (
      <div className="lg:col-span-1 lg:sticky lg:top-8">
        <div className="space-y-4 p-1">
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      </div>
    );
  }

  const containerClasses = isPaletteOpen
    ? "fixed inset-x-0 bottom-0 z-50 h-1/2 bg-white shadow-2xl rounded-t-2xl transform transition-transform duration-300 ease-out translate-y-0 lg:static lg:h-auto lg:shadow-none lg:transform-none lg:z-0 lg:block lg:translate-y-0"
    : "fixed inset-x-0 bottom-0 z-50 h-1/2 shadow-2xl rounded-t-2xl transform transition-transform duration-300 ease-in translate-y-full lg:static lg:h-auto lg:shadow-none lg:transform-none lg:z-0 lg:block lg:translate-y-0";

  return (
    <>
      {/* Overlay mobile */}
      {isPaletteOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onTogglePalette}
        />
      )}

      <div className={`${containerClasses} overflow-y-auto p-4 lg:p-0`}>
        {/* Header Mobile */}
        <div className="flex justify-between items-center mb-4 lg:hidden">
          <h3 className="text-lg font-bold text-gray-800">Instrumentos</h3>
          <button onClick={onTogglePalette} className="p-2 text-gray-500">
            <FiX size={24} />
          </button>
        </div>

        <div className="space-y-4 p-1">
          {/* 1. O Pool (Elementos Já Usados) */}
          <PaletteSection
            title="Usados nesta Apresentação"
            isOpen={activeSections.pool}
            onToggle={() => safeToggle("pool")}
          >
            {pool.length > 0 ? (
              pool.map((item) => {
                const itemData = {
                  name: `${item.display_name} (${item.element_type_name})`,
                  iconUrl: item.image_url,
                  scale: item.scale,
                  image_url_highlight: item.image_url_highlight,
                  element_type_id: item.element_type_id,
                  display_name: item.display_name,
                  assignees: item.assignees || [],
                  element_type_name: item.element_type_name,
                  isTemplate: true,
                };
                return (
                  <PaletteItem
                    key={`${item.element_type_id}-${item.display_name}-${(item.assignees || []).join("-")}`}
                    itemData={itemData}
                  />
                );
              })
            ) : (
              <p className="text-sm text-gray-500 p-2">
                Arraste um item do Catálogo para o palco para criar um template.
              </p>
            )}
          </PaletteSection>

          {/* 2. O Catálogo (Genérico) */}
          <PaletteSection
            title="Catálogo (Genérico)"
            isOpen={activeSections.catalog}
            onToggle={() => safeToggle("catalog")}
          >
            {elementTypes.length > 0 ? (
              elementTypes.map((type) => {
                const itemData = {
                  name: type.name,
                  iconUrl: type.image_url,
                  scale: type.scale,
                  image_url_highlight: type.image_url_highlight,
                  element_type_id: type.id,
                  display_name: null,
                  assignees: [],
                  element_type_name: type.name,
                  isTemplate: false,
                };
                return <PaletteItem key={type.id} itemData={itemData} />;
              })
            ) : (
              <p className="text-sm text-gray-500 p-2">
                Nenhum tipo de instrumento cadastrado.
              </p>
            )}
          </PaletteSection>
        </div>
      </div>
    </>
  );
}
