/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0d1116",
        "bg-card": "#161b22",
        "bg-hover": "#21262d",
        border: "#30363d",
        text: "#e6edf3",
        "text-muted": "#8b949e",
        accent: "#58a6ff",
        "accent-dim": "#388bfd66",
        success: "#3fb950",
        "success-bg": "#238636",
        error: "#f85149",
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease",
      },
    },
  },
  plugins: [],
};
