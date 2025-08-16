import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "#e7e7ee",
        muted: "#6b7280",
        bg: "#f7f7fb",
        card: "#ffffff",
        text: "#0b0b0d",
        brand: "#111827"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(2,6,23,.06), 0 2px 8px rgba(2,6,23,.04)"
      },
      borderRadius: {
        xl2: "1rem"
      }
    }
  },
  plugins: []
};
export default config;
