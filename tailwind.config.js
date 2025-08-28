/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Adicionando a paleta de cores customizada
      colors: {
        "rakusai-yellow-light": "#ffd800",
        "rakusai-yellow-dark": "#f7bf22",
        "rakusai-pink": "#e40788",
        "rakusai-purple": "#b000b0",
      },
      // Adicionando a fonte Poppins como padrão
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
    },
  },
  // Adicionando os dois plugins
  plugins: [require("tailwind-scrollbar"), require("@tailwindcss/typography")],
};
