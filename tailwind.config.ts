import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── exact same tokens as twinity-web-app ── */
        'surface-page':    '#F8F5FF',
        'surface-subtle':  '#F0EBFF',
        'surface-elevated':'#EDE5FF',
        'brand-purple':    '#9a78fe',
        'brand-dark':      '#422266',
        'brand-mid':       '#6B3FA0',
        'content-primary': '#1a0a30',
        'content-secondary':'#4a3465',
        'content-muted':   '#8b7aaa',
      },
      boxShadow: {
        card:       '0 1px 3px rgba(154,120,254,0.06), 0 4px 16px rgba(154,120,254,0.04)',
        'card-hover':'0 4px 20px rgba(154,120,254,0.12), 0 8px 40px rgba(154,120,254,0.06)',
      },
      borderColor: {
        DEFAULT: 'rgba(154,120,254,0.18)',
      },
    },
  },
  plugins: [],
}
export default config
