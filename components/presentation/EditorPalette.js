import React, { useState } from "react";
import PaletteItem from "./PaletteItem";
import PaletteSection from "./PaletteSection";
import KPICardSkeleton from "components/ui/KPICardSkeleton";
import { FiX } from "react-icons/fi"; // 1. IMPORTAR 'FiX' para fechar

/**
 * A "Paleta Inteligente"
 * ATUALIZADO:
 * 1. Controla o estado dos acordeões internos.
 * 2. É uma 'sidebar' em desktop (lg:).
 * 3. É uma 'gaveta inferior' (bottom sheet) em mobile (default).
 */
export default function EditorPalette({
  palette,
  isPaletteOpen,
  onTogglePalette,
}) {
  // 2. RECEBER PROPS
  const { pool = [], elementTypes = [], isLoading } = palette;

  // O estado dos acordeões internos (como estava antes)
  const [openSections, setOpenSections] = useState({
    pool: true,
    catalog: false,
  });

  const toggleSection = (sectionName) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  if (isLoading) {
    return (
      <div className="lg:col-span-1 lg:sticky lg:top-8">
        <div className="space-y-4">
          <KPICardSkeleton />
          <KPICardSkeleton />
        </div>
      </div>
    );
  }

  // --- 3. CLASSES DE CSS RESPONSIVAS ---
  // Default (Mobile): Gaveta flutuante
  const mobileClasses = `fixed bottom-0 left-0 right-0 z-40
                       bg-white border-t-2 border-rakusai-purple
                       shadow-[-4px_0px_20px_rgba(0,0,0,0.2)]
                       transform transition-transform duration-300 ease-in-out
                       ${isPaletteOpen ? "translate-y-0" : "translate-y-full"}`;

  // Desktop (lg:): Sidebar fixa
  const desktopClasses = `lg:sticky lg:top-8 lg:translate-y-0
                        lg:h-auto lg:max-h-[calc(100vh-4rem)]
                        lg:col-span-1
                        lg:border-none lg:shadow-none`;
  // --- FIM DAS CLASSES ---

  return (
    // 4. APLICAR AS CLASSES
    <div
      className={`p-4 rounded-t-lg lg:rounded-lg ${mobileClasses} ${desktopClasses}`}
    >
      {/* 5. CABEÇALHO DA GAVETA (Só aparece no mobile) */}
      <div className="lg:hidden flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-rakusai-purple">
          Paleta de Itens
        </h3>
        <button type="button" onClick={onTogglePalette}>
          <FiX className="w-6 h-6 text-gray-500" />
        </button>
      </div>
      {/* --- FIM DO CABEÇALHO --- */}

      {/* 6. CONTEÚDO COM SCROLL INTERNO (para mobile) */}
      <div className="space-y-4 max-h-[50vh] overflow-y-auto lg:max-h-none lg:overflow-y-visible">
        {/* 2. O Pool da Apresentação (Templates) */}
        <PaletteSection
          title="Pool da Apresentação"
          isOpen={openSections.pool}
          onToggle={() => toggleSection("pool")}
        >
          {pool.length > 0 ? (
            pool.map((item) => {
              const itemData = {
                name: `${item.display_name} (${item.element_type_name})`,
                iconUrl: item.image_url,
                scale: item.scale, // Passando o 'scale'
                image_url_highlight: item.image_url_highlight, // Passando 'highlight'
                element_type_id: item.element_type_id,
                display_name: item.display_name,
                assigned_user_id: item.assigned_user_id,
                element_type_name: item.element_type_name,
                isTemplate: true,
              };
              return (
                <PaletteItem
                  key={`${item.element_type_id}-${item.display_name}`}
                  itemData={itemData}
                />
              );
            })
          ) : (
            <p className="text-sm text-gray-500 p-2">
              Arraste um item do "Catálogo" para o palco para criar um template.
            </p>
          )}
        </PaletteSection>

        {/* 1. O Catálogo (Genérico) */}
        <PaletteSection
          title="Catálogo (Genérico)"
          isOpen={openSections.catalog}
          onToggle={() => toggleSection("catalog")}
        >
          {elementTypes.length > 0 ? (
            elementTypes.map((type) => {
              const itemData = {
                name: type.name,
                iconUrl: type.image_url,
                scale: type.scale, // Passando o 'scale'
                image_url_highlight: type.image_url_highlight, // Passando 'highlight'
                element_type_id: type.id,
                display_name: null,
                assigned_user_id: null,
                element_type_name: type.name,
                isTemplate: false,
              };
              return <PaletteItem key={type.id} itemData={itemData} />;
            })
          ) : (
            <p className="text-sm text-gray-500 p-2">
              Nenhum tipo de elemento cadastrado.
            </p>
          )}
        </PaletteSection>
      </div>
      {/* --- FIM DO CONTEÚDO COM SCROLL --- */}
    </div>
  );
}
