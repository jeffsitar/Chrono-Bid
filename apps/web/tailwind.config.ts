import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#05070d',
        panel: '#0b0f1a',
        cyan: {
          glow: '#38f2ff',
        },
        violet: {
          glow: '#8b5cf6',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px 0 rgba(56, 242, 255, 0.35)',
        'glow-violet': '0 0 24px 0 rgba(139, 92, 246, 0.35)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
