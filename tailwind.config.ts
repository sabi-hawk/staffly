import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "24px", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        // Softonoma blue (matched to the logo gradient)
        brand: { primary: "#1A73C7", light: "#E8F1FB", dark: "#15609F" },
        success: "#059669",
        warning: "#D97706",
        danger: "#DC2626",
        // light, modern sidebar
        sidebar: { DEFAULT: "#FFFFFF", muted: "#F1F5F9", border: "#E8EDF3" },
        text: { primary: "#0F172A", secondary: "#64748B" },
        surface: "#F6F8FB",
        card: "#FFFFFF",
        border: "#E8EDF3",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        soft: "0 4px 16px rgba(16,24,40,0.06)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        h1: ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        h2: ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        h3: ["16px", { lineHeight: "1.5", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.5", fontWeight: "500" }],
      },
      borderRadius: { lg: "0.625rem", md: "0.5rem", sm: "0.375rem" },
      keyframes: {
        "pulse-dot": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: { "pulse-dot": "pulse-dot 1.6s ease-in-out infinite" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
