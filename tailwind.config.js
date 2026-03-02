/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#0f1117',
          surface: '#181c27',
          border: '#252b3b',
          text: '#e8eaf0',
          today: '#0052cc',
        },
      },
    },
  },
  plugins: [],
}
