import React, { useState } from "react";
import {
  FiPrinter,
  FiX,
  FiMaximize,
  FiMinimize,
  FiImage,
} from "react-icons/fi";
import Button from "components/ui/Button";
import TextareaAutosize from "react-textarea-autosize";
import Switch from "components/ui/Switch";

export default function PrintCommentModal({
  isOpen,
  onClose,
  onConfirmPrint,
  onConfirmPng,
}) {
  const [comments, setComments] = useState("");
  const [isCompact, setIsCompact] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    onConfirmPrint(comments, isCompact);
    setComments("");
  };

  const handlePng = () => {
    if (onConfirmPng) {
      onConfirmPng(comments, isCompact);
      setComments("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4 font-sans animate-fade-in">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FiPrinter className="text-rakusai-purple" />
            Configurar Impressão
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* SELEÇÃO DE MODO */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${isCompact ? "bg-rakusai-purple text-white" : "bg-gray-200 text-gray-500"}`}
              >
                {isCompact ? <FiMinimize /> : <FiMaximize />}
              </div>
              <div>
                <span className="block font-bold text-gray-800">
                  Modo Compacto
                </span>
                <span className="text-xs text-gray-500">
                  {isCompact ? "Paisagem, resumido." : "Retrato, detalhado."}
                </span>
              </div>
            </div>
            <Switch
              checked={isCompact}
              onChange={() => setIsCompact(!isCompact)}
            />
          </div>

          {/* Corpo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentários Finais (Opcional)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Este texto aparecerá no final do documento impresso. Útil para
              avisos rápidos.
            </p>
            <TextareaAutosize
              minRows={1}
              maxRows={5}
              className="w-full font-thin text-sm border border-gray-300 rounded-md p-3 text-gray-700 focus:ring-2 focus:ring-rakusai-purple focus:border-transparent outline-none resize-none"
              placeholder="Ex: Levar 10 Okedos"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-gray-200">
          {/* Botão Cancelar: Ordem alterada e largura ajustada */}
          <Button
            onClick={onClose}
            variant="secondary"
            size="small"
            className="order-last sm:order-first w-full sm:w-auto"
          >
            Cancelar
          </Button>

          {/* Botão Gerar PNG */}
          <Button
            onClick={handlePng}
            variant="primary"
            size="small"
            className="gap-2 w-full sm:w-auto"
          >
            <FiImage />
            Gerar PNG
          </Button>

          {/* Botão Gerar PDF */}
          <Button
            onClick={handlePrint}
            variant="primary"
            size="small"
            className="gap-2 w-full sm:w-auto"
          >
            <FiPrinter />
            Gerar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
