import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          green: "#2d6a4f",
          light: "#52b788",
          yellow: "#f4a261",
          bg: "#f8faf8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
