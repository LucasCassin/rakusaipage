import { Poppins, Caveat } from "next/font/google";

// Configuração da Poppins
export const poppins = Poppins({
  weight: ["300", "400", "600", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins", // Cria uma variável CSS para a fonte
});

// Configuração da Caveat
export const caveat = Caveat({
  weight: ["500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-caveat",
});
