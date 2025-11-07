import React, { useState } from "react"; // <-- ADICIONADO 'useState'
import PaletteItem from "./PaletteItem";
import PaletteSection from "./PaletteSection";
import KPICardSkeleton from "components/ui/KPICardSkeleton";

/**
 * A "Paleta Inteligente"
 * MUDANÇA: Agora gerencia o estado "aberto/fechado" dos acordeões.
 */
export default function EditorPalette({ palette }) {
  const { pool = [], elementTypes = [], isLoading } = palette;

  // --- MUDANÇA: O estado vive aqui agora ---
  const [openSections, setOpenSections] = useState({
    pool: true, // "Pool" começa aberto
    catalog: false, // "Catálogo" começa fechado
  });

  const toggleSection = (sectionName) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };
  // --- FIM DA MUDANÇA ---

  if (isLoading) {
    return (
      <div className="space-y-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 2. O Pool da Apresentação (Templates) */}
      <PaletteSection
        title="Pool da Apresentação"
        // --- MUDANÇA: Passando o estado como prop ---
        isOpen={openSections.pool}
        onToggle={() => toggleSection("pool")}
        // --- FIM DA MUDANÇA ---
      >
        {pool.length > 0 ? (
          pool.map((item) => {
            const itemData = {
              name: `${item.display_name} (${item.element_type_name})`,
              iconUrl: item.image_url,
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
        // --- MUDANÇA: Passando o estado como prop ---
        isOpen={openSections.catalog}
        onToggle={() => toggleSection("catalog")}
        // --- FIM DA MUDANÇA ---
      >
        {elementTypes.length > 0 ? (
          elementTypes.map((type) => {
            const itemData = {
              name: type.name,
              iconUrl: type.image_url,
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
  );
}
