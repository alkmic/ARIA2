import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        airblue: "#2A6CF4",
        airnavy: "#0F1B3D",
        airmint: "#10B981"
      }
    }
  },
  plugins: []
};

export default config;
