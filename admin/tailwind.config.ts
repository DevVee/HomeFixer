import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#F97316', 50: '#FFF7ED', 100: '#FFEDD5', 600: '#EA580C' },
      },
    },
  },
  plugins: [],
};
export default config;
