const theme = {
  colors: {
    primary: {
      light: "#60A5FA", // blue-400
      DEFAULT: "#3B82F6", // blue-500
      dark: "#2563EB", // blue-600
    },
    secondary: {
      light: "#A78BFA", // purple-400
      DEFAULT: "#8B5CF6", // purple-500
      dark: "#7C3AED", // purple-600
    },
    background: "#F9FAFB", // gray-50
    surface: "#FFFFFF",
    text: {
      primary: "#111827", // gray-900
      secondary: "#4B5563", // gray-600
      disabled: "#9CA3AF", // gray-400
    },
    error: "#DC2626", // red-600
    success: "#059669", // emerald-600
    warning: "#D97706", // amber-600
  },
  fontFamily: {
    sans: ["Inter", "sans-serif"],
    heading: ["Poppins", "sans-serif"],
  },
  spacing: {
    container: "1120px",
  },
  borderRadius: {
    DEFAULT: "0.375rem",
    large: "0.5rem",
  },
};

// Atualize o tailwind.config.js para usar este tema
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: theme,
  },
  plugins: [],
};
