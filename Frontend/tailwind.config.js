/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          light: "#2d4e78",
          DEFAULT: "#1e3a5f", // Government Navy
          dark: "#12253f",
          darker: "#0a1526"
        },
        govSuccess: {
          light: "#ecfdf5",
          DEFAULT: "#10b981",
          dark: "#047857"
        },
        govError: {
          light: "#fef2f2",
          DEFAULT: "#ef4444",
          dark: "#b91c1c"
        },
        govWarning: {
          light: "#fffbeb",
          DEFAULT: "#f59e0b",
          dark: "#b45309"
        }
      }
    },
  },
  plugins: [],
}
