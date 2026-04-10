/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Bebas Neue', 'cursive'],
      },
      colors: {
        film: {
          black: '#090909',
          dark: '#111111',
          panel: '#161616',
          border: '#252525',
          blue: '#00CFFF',
          'blue-dim': '#0099BB',
          'blue-glow': 'rgba(0,207,255,0.15)',
          red: '#FF3D5A',
          amber: '#FFB800',
          text: '#C8C8C8',
          muted: '#555555',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        'shutter': 'shutter 0.15s ease',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: 1 },
          '100%': { transform: 'scale(1.5)', opacity: 0 },
        },
        shutter: {
          '0%': { opacity: 1 },
          '30%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
