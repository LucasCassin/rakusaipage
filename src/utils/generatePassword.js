export const generatePassword = () => {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const specials = "@$!%*?&";
  const allChars = lowercase + uppercase + numbers + specials;

  // Garantir que a senha tenha pelo menos um de cada tipo
  const randomLower = lowercase[Math.floor(Math.random() * lowercase.length)];
  const randomUpper = uppercase[Math.floor(Math.random() * uppercase.length)];
  const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
  const randomSpecial = specials[Math.floor(Math.random() * specials.length)];

  // Gerar o resto da senha aleatoriamente
  const remainingLength = Math.floor(Math.random() * 11) + 6; // 6 a 16 caracteres adicionais
  let remainingChars = "";
  for (let i = 0; i < remainingLength; i++) {
    remainingChars += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Combinar todos os caracteres e embaralhar
  const password = (
    randomLower +
    randomUpper +
    randomNumber +
    randomSpecial +
    remainingChars
  )
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return password;
};
