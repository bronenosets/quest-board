import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#7c4dff", 2: "#b14dff" },
        pink: { DEFAULT: "#ff6b9d" },
        gold: { DEFAULT: "#ffb800", deep: "#d99500" },
        green: { DEFAULT: "#20c997" },
        red: { DEFAULT: "#ff5a7a" },
        text: { DEFAULT: "#2a1f4d", soft: "#6b5e92", muted: "#a99fc4" },
        card: { DEFAULT: "#ffffff", soft: "#faf6ff" },
        border: { DEFAULT: "#ece4ff" },
        bg: { 1: "#fff5f9", 2: "#f0e8ff", 3: "#fff8e8" },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Nunito', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: "0 2px 8px rgba(124, 77, 255, 0.08)",
        md: "0 8px 24px rgba(124, 77, 255, 0.12)",
        lg: "0 16px 40px rgba(124, 77, 255, 0.18)",
      },
      borderRadius: {
        sm: "10px",
        DEFAULT: "16px",
        lg: "22px",
      },
      animation: {
        fade: "fade 0.25s ease",
        "toast-in": "toast-in 0.3s cubic-bezier(.2,1.2,.4,1)",
        pop: "pop 0.55s cubic-bezier(.2,1.6,.4,1) forwards",
        fall: "fall 2.4s ease-in forwards",
      },
      keyframes: {
        fade: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translate(-50%, -20px) scale(0.9)" },
          to: { opacity: "1", transform: "translate(-50%, 0) scale(1)" },
        },
        pop: { to: { transform: "scale(1)" } },
        fall: { to: { transform: "translateY(110vh) rotate(540deg)", opacity: "0" } },
      },
    },
  },
  plugins: [],
};

export default config;
