export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#F2F2F2',
          secondary: '#D8D9D7',
          tertiary: '#BFBFBD',
        },
        text: {
          primary: '#0D0D0D',
          muted: '#73706C',
          hint: '#BFBFBD',
        },
        accent: {
          DEFAULT: '#0D0D0D',
          hover: '#73706C',
        },
        border: {
          DEFAULT: '#BFBFBD',
          light: '#D8D9D7',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
