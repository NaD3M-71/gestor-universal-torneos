JavaScript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        grafito: '#212529',
        azulAcero: '#457B9D',
        dorado: '#E9C46A',
        verdeVictoria: '#2A9D8F',
        neutroClaro: '#F8F9FA',
        alerta: '#F4A261',
        peligro: '#E76F51',
      },
    },
  },
  plugins: [],
}