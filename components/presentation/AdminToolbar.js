import React from "react";
import Switch from "components/ui/Switch"; //
import Button from "components/ui/Button"; //
import { FiEdit, FiUsers, FiShare2, FiDownload } from "react-icons/fi";

/**
 * A barra de ferramentas que só aparece para Admins.
 * Contém o "interruptor" principal do Modo Editor.
 */
export default function AdminToolbar({
  isEditorMode,
  onToggleEditorMode,
  permissions,
  onOpenCastModal,
  onOpenShareModal,
}) {
  // Se o usuário não tem a "chave" principal de edição,
  // esta barra inteira nem é renderizada.
  if (!permissions.canEdit) {
    return null; //
  }

  return (
    <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <FiEdit className="h-5 w-5 text-rakusai-yellow-dark" />
        <span className="font-bold">Modo Editor</span>
        <Switch //
          checked={isEditorMode}
          onChange={onToggleEditorMode}
        />
      </div>

      {/* Outros botões de gerenciamento */}
      <div className="flex flex-wrap gap-2">
        {permissions.canManageCast && (
          <Button size="small" variant="ghost" onClick={onOpenCastModal}>
            <FiUsers className="mr-2" /> Gerenciar Elenco
          </Button>
        )}

        {/* --- 2. CONECTAR O BOTÃO --- */}
        <Button size="small" variant="ghost" onClick={onOpenShareModal}>
          <FiShare2 className="mr-2" /> Compartilhar
        </Button>
        {/* --- FIM DA MUDANÇA --- */}

        <Button size="small" variant="ghost" disabled>
          {" "}
          {/* Desabilitado por enquanto */}
          <FiDownload className="mr-2" /> Baixar PDF
        </Button>
      </div>
    </div>
  );
}
