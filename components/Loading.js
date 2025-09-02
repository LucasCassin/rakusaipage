import React from "react";

export default function Loading({ message = "Carregando..." }) {
  return (
    // MUDANÇA 1: O container agora é um overlay de tela inteira
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="relative w-48 h-48">
        {/* SVG do Tambor Taiko Animado */}
        <svg
          className="w-full h-full"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fundo do tambor (pele branca) */}
          <circle cx="60" cy="60" r="45" fill="#f7f7f7" />

          {/* Pregos (Byo) do tambor */}
          <circle cx="30" cy="60" r="3" fill="#374151" />
          <circle cx="90" cy="60" r="3" fill="#374151" />
          <circle cx="60" cy="30" r="3" fill="#374151" />
          <circle cx="60" cy="90" r="3" fill="#374151" />

          {/* Círculo de 'batida' pulsante no centro */}
          <circle
            cx="60"
            cy="60"
            r="15"
            className="center-dot"
            style={{
              // MUDANÇA 2: Cor alterada para o rosa da marca
              fill: "rgba(228, 7, 136, 0.4)",
              animation: "dot-pulse 1.5s ease-in-out infinite",
            }}
          />
        </svg>
      </div>
      {/* MUDANÇA 3: Adicionada a mensagem de texto */}
      {message && (
        <p className="mt-4 text-lg font-semibold text-white">{message}</p>
      )}

      {/* Estilos CSS para a animação de pulso */}
      <style jsx>{`
        @keyframes dot-pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
        }
        .center-dot {
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
