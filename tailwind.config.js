/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Volunteer Portal - Light Theme
        forest: {
          DEFAULT: "#1B5E20", // Official Forest Green
          50: "#e8f5e9",
          100: "#c8e6c9",
          200: "#a5d6a7",
          300: "#81c784",
          400: "#66bb6a",
          500: "#1B5E20", // Primary
          600: "#43a047",
          700: "#388e3c",
          800: "#2e7d32",
          900: "#1b5e20",
        },
        'light-grey': "#F4F6F5", // Official Light Grey
        'tiger-gold': "#DAA520", // Official Tiger Gold
        'soft-black': "#1A1A1A", // Official Soft Black

        // Admin Panel - Dark Theme
        'deep-govt': "#004D40", // Official Deep Govt Green
        'rich-black': "#000A07", // Official Rich Black
        'alert-red': "#B71C1C", // Official Alert Red
        'district-blue': "#1976D2", // Official District Blue

        // Legacy/Utility mappings (keeping for safety but updated to match palette)
        tiger: {
          DEFAULT: "#DAA520",
          50: "#fffde7",
          500: "#DAA520",
        },
        bamboo: {
          DEFAULT: "#F4F6F5", // Mapped to Light Grey
          50: "#ffffff",
          100: "#F4F6F5",
        }
      },
      fontFamily: {
        sans: ['Roboto', 'Montserrat', 'Nirmala UI', 'sans-serif'],
        heading: ['Montserrat', 'sans-serif'],
        telugu: ['Nirmala UI', 'sans-serif'],
      },
      backgroundImage: {
        'tiger-pattern': "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h20v20H0z' fill='%23E57A00' fill-opacity='0.1'/%3E%3Cpath d='M10 0l10 10-10 10L0 10z' fill='%230B3D2E' fill-opacity='0.05'/%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [],
};
