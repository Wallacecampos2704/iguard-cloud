module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#05101f',
          900: '#071922',
          800: '#0f2a3b',
          700: '#143451',
          600: '#1d4b6a',
          500: '#2d6c97',
          400: '#5a8fc7',
          300: '#8cb8e3',
        }
      }
    }
  },
  plugins: []
};
