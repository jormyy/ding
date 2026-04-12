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
        felt: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        card: {
          back: "#1e293b",
          face: "#fafafa",
        },
      },
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
