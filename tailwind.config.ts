import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px rgba(2,6,23,.06), 0 2px 8px rgba(2,6,23,.04)"
      }
    }
  },
  plugins: []
};
export default config;
