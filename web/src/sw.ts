/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// 앱 화면 파일만 캐시하고, 지출 데이터(GAS 응답)는 기기에 남기지 않음
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// 한글 폰트는 글자 범위별로 쪼개진 파일이 많아 미리 받지 않고, 쓰인 조각만 처음 볼 때 저장
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);
registerRoute(({ url }) => url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com'), new NetworkOnly());

// 설정의 "업데이트" 토스트에서 보내는 메시지
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

type PushPayload = { title: string; body?: string; url?: string; tag?: string };

// iOS는 푸시를 받을 때마다 알림을 꼭 띄워야 구독이 유지됨
self.addEventListener('push', (e) => {
  let p: PushPayload = { title: '결혼가계부' };
  try {
    p = { ...p, ...(e.data?.json() as PushPayload) };
  } catch {
    if (e.data) p.body = e.data.text();
  }
  e.waitUntil(
    self.registration.showNotification(p.title, {
      body: p.body,
      tag: p.tag,
      icon: '/icons/192.png',
      badge: '/icons/192.png',
      data: { url: p.url ?? '/' },
    }),
  );
});

// 알림을 누르면 열려 있는 앱 창으로 이동하고, 없으면 새로 염
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data as { url?: string } | null)?.url ?? '/', self.location.origin).href;
  e.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (win) {
        await win.focus();
        await win.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
