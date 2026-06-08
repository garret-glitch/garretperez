import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        osrs: {
          darkBg: '#3c2a1e',
          panel: '#c5a882',
          panelDark: '#2b1c0e',
          border: '#5c3d1e',
          borderLight: '#d4aa70',
          orange: '#ff981f',
          yellow: '#ffcc44',
          text: '#ffe066',
          textDark: '#3c2a1e',
          green: '#00b800',
        },
      },
      fontFamily: {
        runescape: ['"Press Start 2P"', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
