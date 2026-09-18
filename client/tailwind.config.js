/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#07090e',
          900: '#0d111a',
          850: '#131825',
          800: '#1a2234',
          700: '#25324b',
        },
        mystery: {
          cyan: '#00f2fe',
          violet: '#9d4edd',
          pink: '#f72585',
          emerald: '#10b981',
          amber: '#fbbf24',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(157, 78, 221, 0.4)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 242, 254, 0.7)' },
        }
      }
    },
  },
  plugins: [],
}
