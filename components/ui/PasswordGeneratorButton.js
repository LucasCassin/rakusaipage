import React from "react";

/**
 * Componente de geração de senha com tooltip
 */
const PasswordGeneratorButton = React.memo(
  ({ onClick, texts, disabled, className = "" }) => (
    <div className={`relative group ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 h-11"
        aria-label={texts}
        disabled={disabled}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </button>
      {/* Tooltip que aparece no hover */}
      {!disabled && (
        <div
          className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 
                   transition-opacity duration-300 bg-gray-800 text-white text-xs 
                   rounded py-1 px-2 whitespace-nowrap
                   
                   // Posicionamento para Mobile (padrão):
                   top-full mt-2 right-0
                   
                   // Sobrescreve para Desktop (sm: e acima):
                   sm:left-1/2 sm:-translate-x-1/2 sm:right-auto"
        >
          {texts}

          {/* Seta do tooltip, também responsiva */}
          <div
            className="absolute w-2 h-2
                     
                     // Posição da seta no Mobile (apontando para cima, à direita):
                     -top-1 right-2
                     
                     // Posição da seta no Desktop (apontando para baixo, ao centro):
                     sm:left-1/2 sm:-translate-x-1/2 sm:right-auto"
          >
            <div className="bg-gray-800 w-2 h-2 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  ),
);

PasswordGeneratorButton.displayName = "PasswordGeneratorButton";

export default PasswordGeneratorButton;
