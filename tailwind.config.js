/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Lucida Sans"', '"Lucida Sans Unicode"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        brand: ['"Times New Roman"', 'Times', 'serif'],
      },
      colors: {
        sprout: {
          bg: '#FFFFFF',
          panel: '#F5FAF7',
          panelBorder: '#E3EFE8',
          primary: '#146C43',
          primaryDark: '#0F5132',
          accent: '#5FBE87',
          accentSoft: '#DCF4E3',
          sent: '#DCF4E3',
          received: '#FFFFFF',
          text: '#1B2B22',
          muted: '#6E8A7A',
          divider: '#EAF3EE',
          cream: '#FBFEFC',
        }
      }
    },
  },
  plugins: [],
}