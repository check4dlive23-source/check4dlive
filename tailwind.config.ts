import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /* 新系统 */
        terminal: {
          bg:      "#050816",
          surface: "#0d1117",
          panel:   "#161b27",
          border:  "rgba(255,255,255,0.05)",
        },
        cyan:  "#00E5FF",
        green: "#00FF88",
        amber: "#FFB020",
        muted: "#7A8499",
        /* Legacy（旧组件不坏） */
        surface: {
          DEFAULT: "#0a0e1a",
          2: "#0d1117",
          3: "#161b27",
          4: "#1e2535",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.05)",
          strong:  "rgba(255,255,255,0.10)",
        },
        foreground: "#eeeef5",
        gold:  "#f5c842",
        live:  "#00FF88",
        dim:   "#4a5568",
      },
      fontFamily: {
        sans:    ["var(--font-geist)", "var(--font-inter)", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "monospace"],
        number:  ["var(--font-jetbrains)", "var(--font-roboto-mono)", "monospace"],
        display: ["var(--font-geist)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
