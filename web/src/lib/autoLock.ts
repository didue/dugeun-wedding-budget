import { auth } from './auth';

const IDLE_KEY = 'wb.autoLockMin';
const BACKGROUND_LIMIT_MS = 5 * 60_000;

export const AUTO_LOCK_OPTIONS = [5, 10, 30, 60];

export function getAutoLockMinutes() {
  try {
    const v = Number(localStorage.getItem(IDLE_KEY));
    return AUTO_LOCK_OPTIONS.includes(v) ? v : 30;
  } catch {
    return 30;
  }
}

export function setAutoLockMinutes(min: number) {
  try {
    localStorage.setItem(IDLE_KEY, String(min));
  } catch {
    // 저장이 막혀 있으면 기본값(30분) 사용
  }
}

/** 조작이 없거나, 앱이 백그라운드에 5분 넘게 있으면 PIN 화면으로 */
export function startAutoLock() {
  let lastActive = Date.now();
  let hiddenAt: number | null = null;

  const touch = () => {
    lastActive = Date.now();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    if (hiddenAt && Date.now() - hiddenAt > BACKGROUND_LIMIT_MS) auth.lock();
    hiddenAt = null;
    touch();
  };
  const timer = window.setInterval(() => {
    if (Date.now() - lastActive > getAutoLockMinutes() * 60_000) auth.lock();
  }, 30_000);

  window.addEventListener('pointerdown', touch);
  window.addEventListener('keydown', touch);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('pointerdown', touch);
    window.removeEventListener('keydown', touch);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
