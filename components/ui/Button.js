import React from "react";

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
    // MUDANÇA: Estilos base que se aplicam a TODOS os botões, incluindo 'link'.
    const commonBaseStyles =
      "flex justify-center items-center rounded-full focus:outline-none transition-all duration-300 antialiased transform-gpu disabled:opacity-50 disabled:cursor-not-allowed";

    // MUDANÇA: Estilos específicos apenas para botões que não são links (com sombra e efeito hover).
    const boxedButtonStyles =
      "shadow-md hover:shadow-lg transform hover:-translate-y-1";

    const sizeStyles = {
      large: "py-3 px-8 text-lg font-bold",
      small: "py-2 px-6 text-sm font-semibold",
    };

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple text-white",
      secondary: "bg-gray-800 text-white hover:bg-rakusai-purple",
      ghost: "font-semibold text-white bg-white/10 hover:bg-white/20",
      themed: "",
      // MUDANÇA: Removido 'shadow-none' e 'transform-none' pois já são o padrão.
      link: "text-rakusai-purple hover:underline bg-transparent",

      // --- LINHA ADICIONADA ---
      danger: "bg-red-600 text-white hover:bg-red-700",
      warning: "bg-yellow-500 text-white hover:bg-yellow-600",
    };

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        // MUDANÇA: A construção da className agora é mais inteligente.
        className={`${commonBaseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${variant !== "link" ? boxedButtonStyles : ""} ${className}`}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
