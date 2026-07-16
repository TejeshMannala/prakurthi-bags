/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1B5E20',
        forest: '#2E7D32',
        leaf: '#81C784',
        beige: '#F8F5EE',
        earth: '#8D6E63',
        gold: '#D4A853',
        cream: '#F8F5EE',
        'sage-white': '#F8F5EE',
        ink: '#1f2a22',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        eco: '0 20px 50px -20px rgba(27,94,32,0.45)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(28px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s ease forwards',
        marquee: 'marquee 28s linear infinite',
        'spin-slow': 'spin-slow 60s linear infinite',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
