import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17211f",
        cloud: "#f5f7f6",
        line: "#dfe7e3",
        pine: "#0f766e",
        mint: "#e7f6ef",
        amber: { ...colors.amber, DEFAULT: "#b7791f" },
        rose: { ...colors.rose, DEFAULT: "#be123c" }
      },
      boxShadow: {
        panel: "0 18px 50px rgba(23, 33, 31, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
