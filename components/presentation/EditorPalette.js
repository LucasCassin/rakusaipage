import React from "react";
import PaletteItem from "./PaletteItem";
import PaletteSection from "./PaletteSection";
import KPICardSkeleton from "components/ui/KPICardSkeleton"; //

/**
 * A "Paleta Inteligente"
 * Contém as seções "Catálogo" e "Pool".
 */
export default function EditorPalette({ palette }) {
  const { pool = [], elementTypes = [], isLoading } = palette;

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
      <PaletteSection title="Pool da Apresentação" startOpen={true}>
        {pool.length > 0 ? (
          pool.map((item) => (
            <PaletteItem
              key={`${item.element_type_id}-${item.display_name}`}
              name={`${item.display_name} (${item.element_type_name})`}
              iconUrl={item.image_url}
              // TODO: Adicionar dados 'draggable'
            />
          ))
        ) : (
          <p className="text-sm text-gray-500 p-2">
            Arraste um item do "Catálogo" para o palco para criar um template.
          </p>
        )}
      </PaletteSection>

      {/* 1. O Catálogo (Genérico) */}
      <PaletteSection title="Catálogo (Genérico)">
        {elementTypes.length > 0 ? (
          elementTypes.map((type) => (
            <PaletteItem
              key={type.id}
              name={type.name}
              iconUrl={type.image_url}
              // TODO: Adicionar dados 'draggable'
            />
          ))
        ) : (
          <p className="text-sm text-gray-500 p-2">
            Nenhum tipo de elemento cadastrado.
          </p>
        )}
      </PaletteSection>
    </div>
  );
}
