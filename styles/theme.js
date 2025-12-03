import { fontFamily } from "tailwindcss/defaultTheme";

const theme = {
  colors: {
    "rakusai-yellow-light": "#ffd800",
    "rakusai-yellow-dark": "#f7bf22",
    "rakusai-pink": "#e40788",
    "rakusai-pink-light": "#ee86c4ff",
    "rakusai-purple": "#b000b0",
    "rakusai-purple-light": "#c472c4ff",
    // Adicione outras cores aqui se necessário
  },
  fontFamily: {
    sans: ["var(--font-poppins)", ...fontFamily.sans],
    handwriting: ["var(--font-caveat)", "cursive"],
  },
};

// Atualize o tailwind.config.js para usar este tema
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: theme,
  },
  plugins: [
    require("tailwind-scrollbar"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
