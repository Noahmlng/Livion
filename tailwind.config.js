/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2e3192", // Main blue color
          dark: "#1e2064",
          light: "#4b52b5",
        },
        secondary: {
          DEFAULT: "#ea5b0c", // Orange accent
          dark: "#c94908",
          light: "#ff7c3a",
        },
        background: {
          dark: "#1a1a2e", // Dark background
          DEFAULT: "#16213e", // Medium background
          light: "#0f3460", // Lighter background
        },
        accent: {
          DEFAULT: "#e94560", // Accent color for important tasks
          green: "#4ade80", // Success color
          yellow: "#fde047", // Warning color
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        display: ["var(--font-cinzel)"],
      },
      borderRadius: {
        'sm': '0.25rem',
        DEFAULT: '0.375rem',
        'md': '0.5rem',
        'lg': '1rem',
      },
      boxShadow: {
        task: '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'task-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
}; 