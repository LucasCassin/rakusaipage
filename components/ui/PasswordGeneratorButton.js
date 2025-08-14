import React from "react";

/**
 * Componente de geração de senha com tooltip
 */
const PasswordGeneratorButton = React.memo(({ onClick, texts, disabled }) => (
  <div className="relative group">
    <button
      type="button"
      onClick={onClick}
      className="h-full border border-l-0 border-gray-300 text-xs font-medium rounded-r-md text-blue-500 bg-white hover:bg-gray-50 focus:outline-none focus:ring-0 px-2 py-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
        {texts}
        {/* Seta apontando para baixo */}
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2">
          <div className="bg-gray-800 w-2 h-2 rotate-45"></div>
        </div>
      </div>
    )}
  </div>
));

PasswordGeneratorButton.displayName = "PasswordGeneratorButton";

export default PasswordGeneratorButton;
