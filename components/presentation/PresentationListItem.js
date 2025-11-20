import React from "react";
import Button from "components/ui/Button";
import Link from "next/link";
import {
  FiEdit,
  FiTrash2,
  FiCalendar,
  FiMapPin,
  FiEye,
  FiSettings,
} from "react-icons/fi";

export default function PresentationListItem({
  presentation,
  permissions,
  onDeleteClick,
  onEditInfoClick,
}) {
  const formattedDate = presentation.date
    ? new Date(presentation.date).toLocaleDateString("pt-BR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-900 truncate text-lg">
            {presentation.name}
          </p>
          {/* Botão de Editar Info (Ícone Pequeno ao lado do nome ou nas ações) */}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
          {formattedDate && (
            <span className="flex items-center gap-1.5">
              <FiCalendar className="h-4 w-4 text-gray-400" />
              <span>{formattedDate}</span>
            </span>
          )}
          {presentation.location && (
            <span className="flex items-center gap-1.5">
              <FiMapPin className="h-4 w-4 text-gray-400" />
              <span>{presentation.location}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
        {/* 1. Botão ABRIR EDITOR (Principal) */}
        {permissions.canUpdate ? (
          <Link href={`/apresentacoes/${presentation.id}`} passHref>
            <Button variant="secondary" size="small" as="a">
              <FiEdit className="mr-2" />
              Editor
            </Button>
          </Link>
        ) : (
          <Link href={`/apresentacoes/${presentation.id}`} passHref>
            <Button variant="secondary" size="small" as="a">
              <FiEye className="mr-2" />
              Abrir
            </Button>
          </Link>
        )}

        {/* 2. Botão EDITAR INFORMAÇÕES (Novo) */}
        {permissions.canUpdate && (
          <Button
            variant="warning"
            size="small"
            onClick={onEditInfoClick}
            title="Editar Informações"
            className="text-gray-500"
          >
            <FiSettings />
          </Button>
        )}

        {/* 3. Botão DELETAR */}
        {permissions.canDelete && (
          <Button
            variant="danger"
            size="small"
            onClick={onDeleteClick}
            title="Excluir Apresentação"
          >
            <FiTrash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
