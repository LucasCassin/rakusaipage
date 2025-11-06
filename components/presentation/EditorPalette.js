import React from "react";
import PaletteItem from "./PaletteItem";
import PaletteSection from "./PaletteSection";
import KPICardSkeleton from "components/ui/KPICardSkeleton";

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
          pool.map((item) => {
            // --- MUDANÇA: Passando o objeto 'itemData' completo ---
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
            // --- FIM DA MUDANÇA ---
          })
        ) : (
          <p className="text-sm text-gray-500 p-2">
            Arraste um item do "Catálogo" para o palco para criar um template.
          </p>
        )}
      </PaletteSection>

      {/* 1. O Catálogo (Genérico) */}
      <PaletteSection title="Catálogo (Genérico)">
        {elementTypes.length > 0 ? (
          elementTypes.map((type) => {
            // --- MUDANÇA: Passando o objeto 'itemData' completo ---
            const itemData = {
              name: type.name,
              iconUrl: type.image_url,
              element_type_id: type.id,
              display_name: null, // Genérico não tem nome
              assigned_user_id: null, // Genérico não tem usuário
              element_type_name: type.name,
              isTemplate: false,
            };
            return <PaletteItem key={type.id} itemData={itemData} />;
            // --- FIM DA MUDANÇA ---
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
