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
        brand: {
          50:  '#f0f4ff',
          100: '#dde7ff',
          200: '#c3d2ff',
          300: '#9db3ff',
          400: '#7b8fff',
          500: '#5c6aff',
          600: '#4347f5',
          700: '#3535db',
          800: '#2d2db1',
          900: '#29298c',
        },
      },
    },
  },
  plugins: [],
}

export default config
