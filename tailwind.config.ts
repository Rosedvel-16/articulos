import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8f6",
          100: "#d5efe9",
          200: "#aee0d4",
          300: "#7cc9b8",
          400: "#4dab9a",
          500: "#2f8f7e",
          600: "#247266",
          700: "#1f5c53",
          800: "#1c4a44",
          900: "#193e3a",
          950: "#0c2422",
        },
        ink: {
          50: "#f6f7f8",
          100: "#eceef0",
          200: "#d5dae0",
          300: "#b0b9c4",
          400: "#8593a3",
          500: "#667685",
          600: "#515f6e",
          700: "#434e5a",
          800: "#3a434c",
          900: "#333a42",
          950: "#22272d",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
