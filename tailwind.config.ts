import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        acai: {
          DEFAULT: "#3B1364",
          dark: "#26073F",
          light: "#5B2196",
        },
        bigode: {
          DEFAULT: "#F0A62E",
          dark: "#D98A15",
          light: "#F7C868",
        },
        cream: "#FBF3E7",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
