import React, { useState, useEffect } from "react";
import {
  FiPrinter,
  FiX,
  FiMaximize,
  FiMinimize,
  FiImage,
  FiCpu,
} from "react-icons/fi";
import Button from "components/ui/Button";
import TextareaAutosize from "react-textarea-autosize";
import Switch from "components/ui/Switch";
import Select from "react-select";
import { theme } from "../../styles/theme";
import { poppins } from "src/utils/fonts";

export default function PrintCommentModal({
  isOpen,
  onClose,
  onConfirmPrint,
  onConfirmPng,
}) {
  const [comments, setComments] = useState("");
  const [isCompact, setIsCompact] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState({
    value: 3,
    label: "Boa (Padrão)",
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Cleanup para remover o listener quando o modal desmontar
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    onConfirmPrint(comments, isCompact, selectedQuality.value);
    setComments("");
  };

  const handlePng = () => {
    if (onConfirmPng) {
      onConfirmPng(comments, isCompact, selectedQuality.value);
      setComments("");
    }
  };

  const qualityOptions = [
    { value: 1, label: "Baixa (Rápido, Rascunho)" },
    { value: 2, label: "Média" },
    { value: 3, label: "Boa (Padrão)" },
    { value: 4, label: "Ótima" },
    { value: 5, label: "Melhor (Alta Definição - Lento)" },
  ];

  const colors = theme.extend.colors;

  const TW_COLORS = {
    gray50: "#f9fafb",
    gray300: "#d1d5db",
    gray400: "#9ca3af",
    purple50: "#faf5ff",
    purple100: "#f3e8ff",
    textMain: "#1F2937",
  };

  const FONT_FAMILY =
    "var(--font-poppins), ui-sans-serif, system-ui, sans-serif";

  const customStyles = {
    control: (base, state) => ({
      ...base,
      fontFamily: FONT_FAMILY,
      minHeight: "42px",
      borderRadius: "0.375rem",
      fontSize: "0.875rem",
      backgroundColor: "white",
      borderColor: state.isFocused
        ? colors["rakusai-purple"]
        : TW_COLORS.gray300,
      boxShadow: state.isFocused
        ? `0 0 0 1px ${colors["rakusai-purple"]}`
        : "none",
      "&:hover": {
        borderColor: state.isFocused
          ? colors["rakusai-purple"]
          : TW_COLORS.gray400,
      },
    }),
    option: (base, state) => ({
      ...base,
      fontFamily: FONT_FAMILY,
      fontSize: "0.875rem",
      cursor: "pointer",
      backgroundColor: state.isSelected
        ? TW_COLORS.purple50
        : state.isFocused
          ? TW_COLORS.gray50
          : "white",
      color: state.isSelected ? colors["rakusai-purple"] : TW_COLORS.textMain,
      fontWeight: state.isSelected ? 500 : 400,
      ":active": {
        backgroundColor: TW_COLORS.purple100,
      },
    }),
    singleValue: (base) => ({
      ...base,
      fontFamily: FONT_FAMILY,
      color: TW_COLORS.textMain,
      fontWeight: 500,
    }),
    menu: (base) => ({
      ...base,
      fontFamily: FONT_FAMILY,
      zIndex: 9999,
      borderRadius: "0.375rem",
      overflow: "hidden",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    }),
    // O Portal em si não precisa de estilo extra aqui se usarmos o classNames abaixo
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999,
    }),
    placeholder: (base) => ({
      ...base,
      fontFamily: FONT_FAMILY,
      color: "#9CA3AF",
    }),
    input: (base) => ({
      ...base,
      fontFamily: FONT_FAMILY,
      color: TW_COLORS.textMain,
    }),
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FiCpu className="text-gray-500" />
              Qualidade da Exportação
            </label>

            <Select
              id="quality-select"
              instanceId="quality-select"
              options={qualityOptions}
              value={selectedQuality}
              onChange={setSelectedQuality}
              styles={customStyles}
              // 2. CORREÇÃO DEFINITIVA:
              // Aplica a classe da variável (poppins.variable) E a classe font-sans ao Portal.
              // Isso garante que o contexto do Portal tenha a variável definida.
              classNames={{
                menuPortal: () => `${poppins.variable} font-sans`,
              }}
              isSearchable={false}
              placeholder="Selecione a qualidade..."
              menuPortalTarget={mounted ? document.body : null}
              menuPosition="fixed"
              menuPlacement="auto"
            />

            <p className="text-xs text-gray-500 mt-2 ml-1">
              *Qualidades acima de &quot;Boa&quot; geram arquivos maiores e
              levam mais tempo.
            </p>
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
