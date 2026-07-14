import React, { useState } from "react";
import { FiDownload, FiX } from "react-icons/fi";
import Button from "components/ui/Button";
import Switch from "components/ui/Switch";

export default function ExportReportModal({
  isOpen,
  isExporting,
  onClose,
  onConfirm,
}) {
  const [title, setTitle] = useState("Relatório de Vendas");
  const [includeAnalytic, setIncludeAnalytic] = useState(false);

  if (!isOpen) return null;

  const trimmedTitle = title.trim();
  const canConfirm = trimmedTitle.length > 0 && !isExporting;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(trimmedTitle, includeAnalytic);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Exportar Relatório em PDF
          </h3>
          <button onClick={onClose} disabled={isExporting}>
            <FiX className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do relatório
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Vendas do Bazar de Julho"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-rakusai-purple focus:border-rakusai-purple"
          />
          <p className="text-xs text-gray-500 mt-1">
            Usado como título na capa do PDF.
          </p>
        </div>

        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
          <div className="pr-4">
            <span className="block font-semibold text-sm text-gray-800">
              Incluir analítico de vendas
            </span>
            <span className="text-xs text-gray-500">
              Lista cada venda individualmente, com os produtos vendidos em cada
              uma.
            </span>
          </div>
          <Switch
            checked={includeAnalytic}
            onChange={() => setIncludeAnalytic((prev) => !prev)}
            disabled={isExporting}
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3 sm:gap-0">
          <Button
            variant="secondary"
            size="small"
            className="w-full sm:w-auto"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="small"
            className="w-full sm:w-auto gap-2"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            <FiDownload />
            {isExporting ? "Gerando PDF..." : "Gerar PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
