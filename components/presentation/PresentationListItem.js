import React from "react";
import Button from "components/ui/Button";
import Link from "next/link";
// --- MUDANÇA: Importar o ícone de Localização ---
import { FiEdit, FiTrash2, FiCalendar, FiMapPin } from "react-icons/fi";
// --- FIM DA MUDANÇA ---

/**
 * Renderiza um item na lista do Dashboard de Apresentações.
 * VERSÃO ATUALIZADA: Mostra Data e Localização.
 */
export default function PresentationListItem({
  presentation,
  permissions,
  onDeleteClick,
}) {
  const formattedDate = presentation.date
    ? new Date(presentation.date).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null; // Nulo se não houver data

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4">
      <div className="flex-1">
        <p className="font-bold text-gray-800">{presentation.name}</p>

        {/* --- MUDANÇA: Exibir Data e Localização --- */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
          {formattedDate && (
            <span className="flex items-center gap-2">
              <FiCalendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </span>
          )}
          {presentation.location && (
            <span className="flex items-center gap-2">
              <FiMapPin className="h-4 w-4" />
              <span>{presentation.location}</span>
            </span>
          )}
        </div>
        {/* --- FIM DA MUDANÇA --- */}
      </div>

      <div className="flex items-center gap-2 mt-4 sm:mt-0">
        {/* Botão Editar (só aparece se tiver a feature) */}
        {permissions.canUpdate && (
          <Link href={`/apresentacoes/${presentation.id}`} passHref>
            <Button variant="secondary" size="small" as="a">
              <FiEdit className="mr-2" />
              Editar
            </Button>
          </Link>
        )}

        {/* Botão Deletar (só aparece se tiver a feature) */}
        {permissions.canDelete && (
          <Button variant="danger" size="small" onClick={onDeleteClick}>
            <FiTrash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
