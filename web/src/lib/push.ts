import { call } from './api';
import { isIOS, isStandalone } from './pwa';

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** 이 기기의 구독 주소. 지출을 등록할 때 같이 보내서 등록한 기기에는 알림이 안 가게 함 */
export async function getMyEndpoint() {
  try {
    return (await currentSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

export async function getPushState(): Promise<PushState> {
  // iOS는 홈 화면에 추가한 앱에서만 푸시를 받을 수 있음 (iOS 16.4+)
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!pushSupported() || !import.meta.env.VITE_VAPID_PUBLIC_KEY) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** 버튼을 누른 동작 안에서 불러야 iOS가 권한 요청을 띄워 줌 */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    }));
  await call('push.subscribe', { subscription: sub.toJSON() });
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const sub = await currentSubscription();
  if (sub) {
    await call('push.unsubscribe', { endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return 'off';
}
