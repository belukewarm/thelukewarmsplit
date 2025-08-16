import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF2FF",
          100: "#E0EAFF",
          500: "#4F46E5",
          600: "#4338CA",
          900: "#0B1026"
        }
      },
      boxShadow: {
        soft: "0 12px 40px rgba(6, 8, 20, 0.12), 0 2px 10px rgba(6, 8, 20, 0.06)"
      }
    }
  },
  plugins: []
};
export default config;
