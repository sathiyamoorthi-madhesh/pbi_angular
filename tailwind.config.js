/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // Use existing CSS vars; safe fallback colors:
        panel: "rgb(var(--panel, 255 255 255) / <alpha-value>)",
        border: "rgb(var(--panel-border, 229 231 235) / <alpha-value>)",
        text: "rgb(var(--text-color, 55 65 81) / <alpha-value>)",
        accent: "rgb(var(--accent, 13 148 136) / <alpha-value>)",
      }
    }
  },
  plugins: []
}