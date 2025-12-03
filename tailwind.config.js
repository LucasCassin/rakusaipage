const theme = require("./styles/theme");
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: theme.content,
  theme: {
    extend: {
      colors: {
        ...theme.theme.extend.colors,
      },
      fontFamily: {
        ...theme.theme.extend.fontFamily,
      },
    },
  },
  plugins: theme.plugins,
};
