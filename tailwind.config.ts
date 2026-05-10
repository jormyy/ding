import type { Config } from "tailwindcss";
import { tailwindColors } from "./src/lib/tokens";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modes/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      colors: tailwindColors,
      keyframes: {
        flip: {
          "0%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "40%": { transform: "rotate(-90deg)" },
          "60%": { transform: "rotate(-90deg)" },
        },
        pulse_border: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(234, 179, 8, 0.7)" },
          "50%": { boxShadow: "0 0 0 8px rgba(234, 179, 8, 0)" },
        },
      },
      animation: {
        flip: "flip 0.6s ease-in-out",
        pulse_border: "pulse_border 1.5s ease-in-out infinite",
        wiggle: "wiggle 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
