import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 새 버전이 배포되면 바로 바꾸지 않고 "업데이트" 토스트로 물어봄
      registerType: 'prompt',
      // 웹 푸시(push·notificationclick)를 받으려고 서비스워커를 직접 작성 (src/sw.ts)
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: '디두와 그니의 결혼 가계부💸',
        short_name: '결혼가계부',
        description: '결혼 준비 예산과 지출, 체크리스트',
        lang: 'ko',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
