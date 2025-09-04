const { fontFamily } = require("tailwindcss/defaultTheme");
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        "rakusai-yellow-light": "#ffd800",
        "rakusai-yellow-dark": "#f7bf22",
        "rakusai-pink": "#e40788",
        "rakusai-pink-light": "#ee86c4ff",
        "rakusai-purple": "#b000b0",
        "rakusai-purple-light": "#f1b1f1ff",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", ...fontFamily.sans],
        handwriting: ["var(--font-caveat)", "cursive"],
      },
    },
  },
  plugins: [
    require("tailwind-scrollbar"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
