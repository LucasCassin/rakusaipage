import React from "react";

/**
 * Botão reutilizável com suporte a diferentes variantes e estados
 */
const Button = React.memo(
  ({
    type = "button",
    onClick,
    disabled = false,
    className = "",
    children,
    variant = "primary", // primary, secondary, link
  }) => {
    const variantStyles = {
      primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
      secondary:
        "text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-500",
      link: "text-blue-600 hover:text-blue-800 underline bg-transparent",
    };

    const baseStyles =
      variant !== "link"
        ? "group relative flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        : "font-medium";

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
