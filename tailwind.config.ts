import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FDFDF1",
        ink: "#1F1A17",
        line: "#E7E5CF",
        brand: { DEFAULT: "#EC5E27", light: "#F47D4D", dark: "#C94A18", soft: "#FCE6DB" },
        good: "#2F7D4F",
        warn: "#946100",
        bad: "#C4302B",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
