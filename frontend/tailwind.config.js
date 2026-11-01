/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        risk: {
          low: '#22c55e',
          moderate: '#eab308',
          high: '#f97316',
          severe: '#ef4444',
          notravel: '#7c3aed',
        },
      },
    },
  },
  plugins: [],
}

