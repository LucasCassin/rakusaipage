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
  FiEyeOff, // --- ADIÇÃO: Ícone para inativo ---
} from "react-icons/fi";

export default function PresentationListItem({
  presentation,
  permissions,
  onDeleteClick,
  onEditInfoClick,
  isPast = false,
  isFirst = false,
  isLast = false,
}) {
  const formattedDate = presentation.date
    ? new Date(presentation.date).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  // --- ADIÇÃO: Verifica se está ativa (padrão true) ---
  const isActive = presentation.is_active !== false;
  // ----------------------------------------------------

  return (
    <div
      className={`
        flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 
        transition-colors border-l-4
        ${isFirst ? "rounded-t-lg" : ""} 
        ${isLast ? "rounded-b-lg" : ""}
        ${
          // Se estiver INATIVA, usamos um fundo avermelhado bem suave para diferenciar de "Past"
          !isActive
            ? "bg-red-50 !border-l-red-400"
            : isPast
              ? "bg-gray-50 !border-l-gray-300 hover:bg-gray-100"
              : "bg-white !border-l-transparent hover:!border-l-rakusai-pink"
        }
      `}
    >
      <div className="flex-1 min-w-0 pr-4">
        {/* --- ALTERAÇÃO: Flex wrap no título para acomodar o badge no mobile --- */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="text-lg font-bold text-gray-800">
            {presentation.name}
          </h3>

          {!isActive && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200"
              title="Esta apresentação está inativa e visível apenas para você."
            >
              <FiEyeOff className="mr-1" />
              Inativa
            </span>
          )}
        </div>
        {/* -------------------------------------------------------------------- */}

        <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 gap-1 sm:gap-4">
          {formattedDate && (
            <div className="flex items-center">
              <FiCalendar className="mr-1 text-gray-400" />
              {formattedDate}
            </div>
          )}
          {presentation.location && (
            <div className="flex items-center truncate max-w-xs">
              <FiMapPin className="mr-1 text-gray-400" />
              <span className="truncate">{presentation.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-row w-full sm:w-auto items-center gap-2 mt-4 sm:mt-0">
        {/* 1. Botão ABRIR / EDITOR */}
        {permissions.canUpdate ? (
          <Link
            href={`/apresentacoes/${presentation.id}`}
            passHref
            legacyBehavior
          >
            {/* Nota: Adicionei legacyBehavior se estiver usando Next.js < 13 ou dependendo da config, 
                 mas mantendo o padrão do seu arquivo original: */}
            <Button
              variant="secondary"
              size="small"
              as="a"
              className="w-full sm:w-auto justify-center"
            >
              <FiEdit className="mr-2" />
              Editor
            </Button>
          </Link>
        ) : (
          <Link href={`/apresentacoes/${presentation.id}`} passHref>
            <Button
              variant="secondary"
              size="small"
              as="a"
              className="w-full sm:w-auto justify-center"
              // Se inativo e não for dono (canUpdate), o backend barra,
              // mas visualmente aqui já indicamos com o badge.
            >
              <FiEye className="mr-2" />
              Abrir
            </Button>
          </Link>
        )}

        {/* ... (Botões restantes Settings e Trash mantidos iguais) ... */}

        {/* 2. Botão EDITAR INFORMAÇÕES */}
        {permissions.canUpdate && (
          <Button
            variant="warning"
            size="small"
            onClick={onEditInfoClick}
            title="Editar Informações"
            className="text-gray-500 w-full sm:w-auto justify-center"
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
            className="w-full sm:w-auto justify-center"
          >
            <FiTrash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
