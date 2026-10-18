import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12212B",
        mist: "#F2F5F6",
        brand: { DEFAULT: "#0E7C70", dark: "#0A5A51", soft: "#DDF1EE" },
        amberx: "#B7791F",
        coral: "#D9534F",
      },
      fontFamily: { sans: ["var(--font-manrope)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
