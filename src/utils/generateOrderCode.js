import crypto from "crypto";

export default function generateOrderCode() {
  // Gera 3 bytes (6 caracteres hex) e adiciona um ano ou prefixo
  // Exemplo de resultado: #9A2B-2024
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  const year = new Date().getFullYear();
  return `#${random}-${year}`;
}
