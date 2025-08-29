import React from "react";

/**
 * Botão reutilizável e refinado com suporte a variantes, tamanhos e estados de foco customizados.
 */
const Button = React.memo(
  ({
    type = "button",
    onClick,
    disabled = false,
    className = "",
    children,
    variant = "primary",
    size = "large",
  }) => {
    // MUDANÇA 1: Removido 'border border-transparent' e adicionado 'transform-gpu' para renderização suave
    const baseStyles =
      variant !== "link"
        ? "group relative flex justify-center items-center rounded-full focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 antialiased transform-gpu"
        : "font-bold transition-colors";

    const sizeStyles = {
      large: "py-3 px-8 text-lg font-bold",
      small: "py-2 px-6 text-sm font-semibold",
    };

    // MUDANÇA 2: Ordem do gradiente corrigida
    const variantStyles = {
      primary:
        "bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple text-white",
      secondary: "bg-gray-800 text-white hover:bg-rakusai-purple",
      ghost:
        "font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors",
      themed: "",
      link: "text-rakusai-purple hover:underline bg-transparent shadow-none hover:shadow-none transform-none",
    };

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
