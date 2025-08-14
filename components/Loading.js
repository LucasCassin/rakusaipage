import React from "react";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-gray-100/98 z-50 flex items-center justify-center pointer-events-none">
      <div className="relative w-48 h-48">
        {/* Logo animado com contorno */}
        <svg
          className="w-full h-full"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fundo sutilmente visível para referência */}
          <path
            d="M15,60 C15,35.1472 35.1472,15 60,15 C84.8528,15 105,35.1472 105,60 C105,84.8528 84.8528,105 60,105 C35.1472,105 15,84.8528 15,60 Z"
            fill="none"
            stroke="#f5f5f5"
            strokeWidth="1"
          />

          {/* Arco principal (não se fecha completamente) */}
          <path
            d="M15,60 C15,35.1472 35.1472,15 60,15 C84.8528,15 105,35.1472 105,60 C105,84.8528 84.8528,105 60,105 C35.1472,105 15,84.8528 15,60 Z"
            fill="none"
            stroke="#4f46e5"
            strokeWidth="3"
            strokeLinecap="round"
            className="logo-outline"
            style={{
              strokeDasharray: "282",
              strokeDashoffset: "282",
              animation: "logo-draw 3s ease-in-out infinite",
            }}
          />

          {/* Elemento interno - linhas cruzadas */}
          <path
            d="M40,40 L80,80 M80,40 L40,80"
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="logo-cross"
            style={{
              strokeDasharray: "113",
              strokeDashoffset: "113",
              animation: "cross-draw 3s ease-in-out infinite",
              animationDelay: "0.75s",
            }}
          />

          {/* Elemento central - ponto pulsante */}
          <circle
            cx="60"
            cy="60"
            r="10"
            className="center-dot"
            style={{
              fill: "rgba(79, 70, 229, 0.2)",
              animation: "dot-pulse 3s ease-in-out infinite",
              animationDelay: "1.2s",
            }}
          />

          {/* Elementos decorativos - pequenos círculos */}
          <circle
            cx="30"
            cy="60"
            r="4"
            className="accent-dot left-dot"
            style={{
              fill: "#4f46e5",
              opacity: 0,
              animation: "accent-appear 3s ease-in-out infinite",
              animationDelay: "1.5s",
            }}
          />

          <circle
            cx="90"
            cy="60"
            r="4"
            className="accent-dot right-dot"
            style={{
              fill: "#4f46e5",
              opacity: 0,
              animation: "accent-appear 3s ease-in-out infinite",
              animationDelay: "1.8s",
            }}
          />

          <circle
            cx="60"
            cy="30"
            r="4"
            className="accent-dot top-dot"
            style={{
              fill: "#4f46e5",
              opacity: 0,
              animation: "accent-appear 3s ease-in-out infinite",
              animationDelay: "2.1s",
            }}
          />

          <circle
            cx="60"
            cy="90"
            r="4"
            className="accent-dot bottom-dot"
            style={{
              fill: "#4f46e5",
              opacity: 0,
              animation: "accent-appear 3s ease-in-out infinite",
              animationDelay: "2.4s",
            }}
          />
        </svg>

        {/* Estilos CSS para as animações */}
        <style jsx>{`
          @keyframes logo-draw {
            0% {
              stroke-dashoffset: 282;
            }
            40% {
              stroke-dashoffset: 180;
            }
            70% {
              stroke-dashoffset: 70;
            }
            90% {
              stroke-dashoffset: 20;
            }
            100% {
              stroke-dashoffset: 282;
            }
          }

          @keyframes cross-draw {
            0% {
              stroke-dashoffset: 113;
            }
            40% {
              stroke-dashoffset: 80;
            }
            70% {
              stroke-dashoffset: 30;
            }
            90% {
              stroke-dashoffset: 5;
            }
            100% {
              stroke-dashoffset: 113;
            }
          }

          @keyframes dot-pulse {
            0% {
              transform: scale(0.5);
              opacity: 0.1;
            }
            50% {
              transform: scale(1.2);
              opacity: 0.8;
            }
            100% {
              transform: scale(0.5);
              opacity: 0.1;
            }
          }

          @keyframes accent-appear {
            0% {
              opacity: 0;
              transform: scale(0);
            }
            50% {
              opacity: 0.9;
              transform: scale(1);
            }
            100% {
              opacity: 0;
              transform: scale(0);
            }
          }

          .logo-outline,
          .logo-cross {
            transform-origin: center;
          }

          .center-dot,
          .accent-dot {
            transform-origin: center;
          }
        `}</style>
      </div>
    </div>
  );
}
