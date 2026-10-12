/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          dark: '#0a0d14',
          card: '#121722',
          cardHover: '#1a202c',
          border: '#1e293b',
          borderHighlight: '#334155',
          accent: '#06b6d4',
          accentGlow: 'rgba(6, 182, 212, 0.15)',
          alert: '#ef4444',
          alertGlow: 'rgba(239, 68, 68, 0.2)',
          warning: '#f59e0b',
          success: '#10b981',
          ai: '#8b5cf6',
          aiGlow: 'rgba(139, 92, 246, 0.15)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'sweep 4s linear infinite',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}
