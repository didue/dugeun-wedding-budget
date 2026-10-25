import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 새 버전이 배포되면 바로 바꾸지 않고 "업데이트" 토스트로 물어봄
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: '우리 결혼 가계부',
        short_name: '결혼가계부',
        description: '결혼 준비 예산과 지출, 체크리스트',
        lang: 'ko',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        theme_color: '#fafaf9',
        background_color: '#fafaf9',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 화면 파일만 캐시하고, 지출 데이터(GAS 응답)는 기기에 남기지 않음
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
