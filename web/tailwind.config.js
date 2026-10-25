/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 소라색 포인트. 글자가 올라가는 버튼은 흰 글씨 대비를 위해 600, 막대·아이콘 등은 500
        brand: {
          50: '#F1F7FE',
          100: '#E2EEFC',
          200: '#C5DDF8',
          300: '#9EC5F1',
          400: '#74A9E8',
          500: '#5592DE',
          600: '#3F7BC9',
          700: '#3464A6',
          800: '#2E5386',
          900: '#29466C',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans KR"', '-apple-system', 'BlinkMacSystemFont', '"Apple SD Gothic Neo"', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        },
      },
      animation: {
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
};
