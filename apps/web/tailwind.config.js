/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ivory: '#F7F1E7',
          'ivory-dark': '#EFE8DC',
          'ivory-light': '#FDFBF7',
          maroon: '#702C3B',
          'maroon-dark': '#551F2C',
          'maroon-light': '#8E384B',
          gold: '#B89A62',
          'gold-light': '#D4BA88',
          'gold-dark': '#9A7D46',
          charcoal: '#292521',
          'charcoal-light': '#4A453F',
          'charcoal-muted': '#78716C',
          beige: '#EFE8DC',
          'beige-dark': '#DDD3C4',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 10px 30px -10px rgba(112, 44, 59, 0.08), 0 4px 6px -2px rgba(41, 37, 33, 0.04)',
        'luxury-hover': '0 20px 35px -10px rgba(112, 44, 59, 0.15), 0 8px 12px -4px rgba(41, 37, 33, 0.06)',
      },
      borderRadius: {
        'luxury': '0.75rem',
      },
    },
  },
  plugins: [],
};
