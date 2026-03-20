import React from "react";

/**
 * Componente de botão de copiar com tooltip
 */
const CopyButton = React.memo(
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
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 8h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </button>
      {!disabled && (
        <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap top-full mt-2 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto">
          {texts}
          <div className="absolute w-2 h-2 -top-1 right-2 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto">
            <div className="bg-gray-800 w-2 h-2 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  ),
);

CopyButton.displayName = "CopyButton";

export default CopyButton;
