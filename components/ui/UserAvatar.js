import React, { useMemo } from "react";

const UserAvatar = ({ username }) => {
  const initials = useMemo(() => {
    if (!username) return "LC";

    // Tenta dividir o nome por letras maiúsculas (para camelCase/PascalCase)
    const parts = username.match(/[A-Z]?[a-z]+/g) || [];

    if (parts.length > 1) {
      // Pega a primeira letra da primeira parte e da última parte
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    } else if (username.length > 1) {
      // Se não, pega as duas primeiras letras
      return username.substring(0, 2).toUpperCase();
    } else {
      // Se for só uma letra
      return username.toUpperCase();
    }
  }, [username]);

  // Gera uma cor de fundo com base no username para ser consistente
  const bgColor = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 50%, 70%)`;
    return color;
  }, [username]);

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold select-none"
      style={{ backgroundColor: bgColor }}
      aria-label={`Avatar de ${username}`}
    >
      {initials}
    </div>
  );
};

export default UserAvatar;
