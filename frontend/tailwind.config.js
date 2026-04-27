/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        muni: {
          azul: '#1E3A8A',
          azulMedio: '#2E4AB8',
          verde: '#8DC63F',
          verdeClaro: '#A3D455',
          celeste: '#BFD9F2',
          crema: '#F5F6FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
