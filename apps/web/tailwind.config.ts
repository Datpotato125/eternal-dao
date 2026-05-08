import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  '#f0ede5',
          100: '#e2d5b0',
          200: '#c4a96d',
          300: '#8a7d60',
          400: '#5a5040',
          500: '#2a2440',
          600: '#1a1828',
          700: '#12121e',
          800: '#0d0d18',
          900: '#0a0a14',
          950: '#060610',
        },
        gold: {
          300: '#f5d98a',
          400: '#e8c060',
          500: '#c9a84c',
          600: '#a88930',
          700: '#7a6020',
        },
        jade: {
          300: '#8cc4a0',
          400: '#6aab82',
          500: '#4a8c62',
          600: '#3a7050',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        body:   ['Crimson Text', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
