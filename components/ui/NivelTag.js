import React from "react";

export default function NivelTag({ nivel }) {
  if (!nivel) {
    return null;
  }

  // MUDANÇA: O mapa de cores agora é um objeto com mais detalhes
  const colorMap = {
    0: {
      // Iniciante
      bg: "bg-rakusai-pink",
      text: "text-white",
    },
    1: {
      // Intermediário
      bg: "bg-rakusai-purple",
      text: "text-white",
    },
    2: {
      // Avançado (mantém o gradiente)
      bg: "bg-gradient-to-r from-rakusai-yellow-dark via-rakusai-pink to-rakusai-purple",
      text: "text-white",
    },
    3: {
      // Admin (preto)
      bg: "bg-gray-700",
      text: "text-white",
    },
  };

  const modalidadeLabel = nivel.feature.includes(":taiko:") ? "Taiko" : "Fue";
  // Pega o conjunto de estilos ou um padrão, caso não encontre
  const styles = colorMap[nivel.ord] || {
    bg: "bg-gray-200",
    border: "border-gray-500",
    text: "text-gray-700",
  };

  return (
    // MUDANÇA: Adicionamos 'border-2' e construímos as classes dinamicamente
    <span
      className={`inline-block px-3 py-0.5 text-xs font-normal rounded-full
                 ${styles.bg} ${styles.text}`}
    >
      {modalidadeLabel}: {nivel.label}
    </span>
  );
}
