import React, { useState } from "react";
import { FiPrinter, FiX } from "react-icons/fi";
import Button from "components/ui/Button";
import TextareaAutosize from "react-textarea-autosize";

export default function PrintCommentModal({ isOpen, onClose, onConfirmPrint }) {
  const [comments, setComments] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    onConfirmPrint(comments);
    // Limpa o comentário após confirmar (opcional, dependendo da preferência)
    // setComments("");
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
            Preparar Impressão
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6">
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

        {/* Rodapé */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center gap-3 border-t border-gray-200">
          <Button onClick={onClose} variant="secondary" size="small">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            className="gap-2"
            size="small"
          >
            <FiPrinter />
            Gerar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
