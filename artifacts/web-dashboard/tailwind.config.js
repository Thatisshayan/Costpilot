/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0f172a',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        cyan: {
          400: '#06b6d4',
          500: '#06b6d4',
        },
        purple: {
          500: '#a855f7',
        },
        orange: {
          500: '#f97316',
        },
        green: {
          500: '#22c55e',
        },
        red: {
          500: '#ef4444',
        },
      },
      fontFamily: {
        'clash': ['Clash Display', 'sans-serif'],
        'jakarta': ['Plus Jakarta Sans', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
