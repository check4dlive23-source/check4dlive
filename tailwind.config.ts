import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0d0d14",
          2: "#13131e",
          3: "#1c1c2a",
          4: "#242436",
        },
        line: {
          DEFAULT: "rgba(255, 255, 255, 0.07)",
          strong: "rgba(255, 255, 255, 0.13)",
        },
        foreground: "#eeeef5",
        muted: "#6a6a90",
        dim: "#38385a",
        gold: "#f5c842",
        live: "#22c55e",
      },
      fontFamily: {
        number: ["var(--font-rajdhani)", "sans-serif"],
        sans: ["var(--font-noto-sans-sc)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
