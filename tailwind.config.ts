import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-gowun-batang)', 'sans-serif'],
      },
      colors: {
        beige: {
          50: '#FAF7F2',
          100: '#F5EFE6',
          200: '#EBDCD0',
        },
        primary: {
          500: '#8C7B6B',
          600: '#736254',
          700: '#5A4A3E',
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
export default config;
