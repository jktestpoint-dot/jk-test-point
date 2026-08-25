import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1d4ed8",
          900: "#0f2b6e"
        }
      },
      boxShadow: { card: "0 10px 30px rgba(15,43,110,.08)" }
    }
  },
  plugins: []
} satisfies Config;
