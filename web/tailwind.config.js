/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 로열 블루 포인트. 기준 팔레트: #141466(900) · #2929CC(600) · #6677CC(400) · #DADAE6(200)
        // 글자가 올라가는 버튼은 흰 글씨 대비를 위해 600, 막대·아이콘 등은 500
        // ※ 차트·분류 색(lib/aggregate.ts FALLBACK_COLORS, 설정에서 고른 색)은 이 값과 무관
        brand: {
          50: '#F3F3FA',
          100: '#E8E8F4',
          200: '#DADAE6',
          300: '#A0A8D9',
          400: '#6677CC',
          500: '#3E44CC',
          600: '#2929CC',
          700: '#2222AA',
          800: '#1B1B88',
          900: '#141466',
        },
        // 보조 포인트(핑크). 로열 블루와 어울리게 푸른기 도는 쿨톤 핑크 — 홈 예산 막대, D-day 뱃지
        blush: {
          50: '#FDF1F6',
          100: '#FBE3EE',
          200: '#F7C9DD',
          300: '#F0A3C4',
          400: '#E676A7',
          500: '#DB4F8E',
          600: '#C23A76',
          700: '#A12A64',
          800: '#7F2252',
          900: '#5E1A3E',
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
