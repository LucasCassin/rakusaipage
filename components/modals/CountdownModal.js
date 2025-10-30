import React, { useState, useEffect } from "react";
import { getDaysUntilEvent } from "src/utils/dateUtils";
import Button from "../ui/Button";

// --- DEFINIÇÃO DOS TEMAS ---
// Cada objeto representa um tema completo para o modal.
const themes = [
  {
    gradient: "bg-gradient-to-br from-rakusai-pink to-rakusai-purple",
    dateBg: "bg-rakusai-yellow-dark",
    dateText: "text-gray-900",
    primaryBtnBg: "bg-rakusai-yellow-dark",
    primaryBtnText: "text-gray-900",
    primaryBtnHover: "hover:bg-white",
  },
  {
    gradient: "bg-gradient-to-br from-rakusai-purple to-rakusai-yellow-dark",
    dateBg: "bg-rakusai-yellow-dark",
    dateText: "text-gray-900",
    primaryBtnBg: "bg-rakusai-pink",
    primaryBtnText: "text-white",
    primaryBtnHover: "hover:bg-white hover:text-rakusai-pink",
  },
  {
    gradient: "bg-gradient-to-br from-rakusai-yellow-dark to-rakusai-pink",
    dateBg: "bg-rakusai-purple",
    dateText: "text-white",
    primaryBtnBg: "bg-rakusai-purple",
    primaryBtnText: "text-white",
    primaryBtnHover: "hover:bg-white hover:text-rakusai-purple",
  },
];

// --- SUB-COMPONENTES ---

const DateBlock = ({ dateString, bgColor, textColor }) => {
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const correctedDate = new Date(date.getTime() + userTimezoneOffset);
  const day = correctedDate.getDate();
  const month = correctedDate
    .toLocaleString("pt-BR", { month: "short" })
    .toUpperCase()
    .replace(".", "");
  return (
    // As cores agora são dinâmicas, baseadas no tema
    <div
      className={`text-center ${bgColor} ${textColor} p-2 rounded-lg w-24 h-24 flex flex-col justify-center shadow-lg flex-shrink-0`}
    >
      <span className="text-5xl font-black leading-tight">{day}</span>
      <span className="text-lg font-bold tracking-wider">{month}</span>
    </div>
  );
};

const CountdownText = ({ days }) => {
  if (days === 0)
    return (
      <span className="text-6xl md:text-7xl font-black text-white animate-pulse">
        É HOJE!
      </span>
    );
  if (days === 1)
    return (
      <span className="text-6xl md:text-7xl font-black text-white animate-pulse">
        É AMANHÃ!
      </span>
    );
  return (
    <>
      <span className="text-8xl md:text-9xl font-black text-white">{days}</span>
      <span className="text-3xl md:text-4xl font-bold text-gray-200 mt-2">
        dias
      </span>
    </>
  );
};

// --- COMPONENTE PRINCIPAL DO MODAL ---

export default function CountdownModal({
  isOpen,
  onClose,
  onDismissForever,
  event,
}) {
  // Estado para guardar o tema sorteado
  const [theme, setTheme] = useState(themes[0]); // Inicia com o primeiro tema

  // Escolhe um tema aleatório quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      setTheme(randomTheme);
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const daysUntil = getDaysUntilEvent(event.date);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-6xl text-center text-white rounded-2xl shadow-2xl 
                   bg-gradient-to-br ${theme.gradient} 
                   flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MUDANÇA AQUI: scrollbar-track-transparent */}
        <div
          className="overflow-y-auto p-6 md:p-10 
                       scrollbar-thin scrollbar-thumb-rounded-full 
                       scrollbar-track-transparent 
                       scrollbar-thumb-transparent"
        >
          {daysUntil > 1 && (
            <p className="font-semibold text-gray-100 text-lg mb-4">Faltam</p>
          )}

          <div className="flex flex-col items-center justify-center mb-8">
            <CountdownText days={daysUntil} />
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-8">{event.title}</h2>

          <div className="w-full max-w-2xl mx-auto space-y-8">
            <div className="flex justify-center items-center gap-6">
              <DateBlock
                dateString={event.date}
                bgColor={theme.dateBg}
                textColor={theme.dateText}
              />
              <a
                href={event.googleMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg text-gray-100 text-justify hover:text-white transition-colors"
              >
                {event.locationName}
              </a>
            </div>

            <div
              className="prose prose-invert lg:prose-lg mx-auto text-gray-200 prose-p:text-justify"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        </div>

        {/* Rodapé fixo com os botões de ação */}
        <div className="p-6 mt-auto border-t border-white/20">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="ghost"
              onClick={onDismissForever}
              className="py-3 px-6 rounded-full w-full sm:w-auto"
            >
              Não mostrar novamente
            </Button>

            <Button
              variant="themed"
              onClick={onClose}
              className={`font-bold ${theme.primaryBtnBg} ${theme.primaryBtnText} ${theme.primaryBtnHover} py-3 px-8 rounded-full transition-colors w-full sm:w-auto`}
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
