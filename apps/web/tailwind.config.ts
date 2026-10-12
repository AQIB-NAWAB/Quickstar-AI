import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        heat: {
          4: "#fa5d190a",
          8: "#fa5d1914",
          12: "#fa5d191f",
          16: "#fa5d1929",
          20: "#fa5d1933",
          24: "#fa5d193d",
          40: "#fa5d1966",
          48: "#fa5d197a",
          90: "#fa5d19e6",
          100: "#fa5d19",
        },
        "accent-black": "#262626",
        "accent-white": "#ffffff",
        surface: "#ffffff",
        "background-base": "#f9f9f9",
        "background-lighter": "#fbfbfb",
        "border-faint": "#ededed",
        "border-muted": "#e8e8e8",
        "border-loud": "#e6e6e6",
        "accent-bluetron": "#2a6dfb",
        "accent-amethyst": "#9061ff",
        "accent-crimson": "#eb3424",
        "accent-forest": "#42c366",
        "accent-honey": "#ecb730",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Roboto Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "monospace",
        ],
      },
      borderRadius: {
        "6": "6px",
        "8": "8px",
        "10": "10px",
        "12": "12px",
        "14": "14px",
        "16": "16px",
        "20": "20px",
      },
      boxShadow: {
        "firecrawl-card":
          "0px 0px 44px 0px rgba(0, 0, 0, 0.02), 0px 88px 56px -20px rgba(0, 0, 0, 0.03), 0px 56px 56px -20px rgba(0, 0, 0, 0.02), 0px 32px 32px -20px rgba(0, 0, 0, 0.03), 0px 16px 24px -12px rgba(0, 0, 0, 0.03), 0px 0px 0px 1px #ededed",
        "firecrawl-btn": "0px 2px 4px rgba(250, 93, 25, 0.2), 0px 1px 2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
