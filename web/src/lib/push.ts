import { call } from './api';
import { isIOS, isStandalone } from './pwa';

// 이 기기 주인 이름 (결제한 사람 목록 값). 지출을 등록할 때 같이 보내서 본인에게는 알림이 안 가게 함
const NAME_KEY = 'wb.pushName';

export function getMyName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

function setMyName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // 저장이 막혀 있으면 지출 등록 때 이름 없이 보냄 (모든 기기에 알림)
  }
}

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushState(): Promise<PushState> {
  // iOS는 홈 화면에 추가한 앱에서만 푸시를 받을 수 있음 (iOS 16.4+)
  if (isIOS() && !isStandalone()) return 'needs-install';
  if (!pushSupported() || !import.meta.env.VITE_VAPID_PUBLIC_KEY) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** 버튼을 누른 동작 안에서 불러야 iOS가 권한 요청을 띄워 줌 */
export async function enablePush(name: string): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    }));
  await call('push.subscribe', { subscription: sub.toJSON(), name });
  setMyName(name);
  return 'on';
}

/** 알림을 켠 채로 이름만 바꿀 때 */
export async function renamePush(name: string) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await call('push.subscribe', { subscription: sub.toJSON(), name });
  setMyName(name);
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await call('push.unsubscribe', { endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return 'off';
}
