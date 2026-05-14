/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        camaf: {
          cream: '#f3eee3',
          mist: '#d8f0e8',
          mint: '#80dbb6',
          sage: '#6eae98',
          ink: '#0c0d10'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
