import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff4f4",
          100: "#ffe5e5",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#e87979",
          500: "#a52a2a",
          600: "#800000",
          700: "#650000",
          900: "#3d0000"
        }
      },
      boxShadow: { card: "0 10px 30px rgba(61,0,0,.08)" }
    }
  },
  plugins: []
} satisfies Config;
