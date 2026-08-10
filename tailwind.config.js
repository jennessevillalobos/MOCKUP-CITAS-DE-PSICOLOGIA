/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17324b',
        brand: { 50: '#f1f6fb', 100: '#e1ecf5', 200: '#c5d9e8', 300: '#9ebbd2', 400: '#7fa4c1', 500: '#5d83a7', 600: '#4d7195', 700: '#3e5e7d', 800: '#2d485f', 900: '#20384b' },
        lilac: { 50: '#f6f3fa', 100: '#ede7f5', 200: '#ddd2ec', 300: '#c3b3d9', 400: '#ab98c8', 500: '#9580b9', 600: '#806ba3', 700: '#69578a' },
      },
      fontFamily: { display: ['Georgia', 'serif'], sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { soft: '0 18px 55px rgba(45, 72, 95, .13)', lift: '0 24px 60px rgba(45, 72, 95, .18)' },
      borderRadius: { organic: '2rem 5rem 2rem 5rem', '4xl': '2rem' },
      backgroundImage: { 'brand-gradient': 'linear-gradient(135deg, #5d83a7 0%, #718fb0 48%, #9580b9 100%)', 'mist-gradient': 'linear-gradient(125deg, #ffffff 0%, #f1f6fb 52%, #e8e0f2 100%)' },
    },
  },
  plugins: [],
};
