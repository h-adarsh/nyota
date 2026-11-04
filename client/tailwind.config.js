/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a1217',
          black: '#0a1217',
        },
        paper: {
          DEFAULT: '#ffffff',
          white: '#ffffff',
        },
        frost: {
          DEFAULT: '#e4eff7',
          wash: '#e4eff7',
        },
        stone: {
          DEFAULT: '#85898b',
          gray: '#85898b',
        },
        obsidian: '#000000',
        lime: {
          DEFAULT: '#cdfe00',
          electric: '#cdfe00',
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'GT Super', 'Tiempos Headline', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', '"Sana Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '24': '24px',
        'card': '24px',
        'input': '24px',
        'pill': '9999px',
      },
    },
  },
  plugins: [],
}
