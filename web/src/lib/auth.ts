import { useSyncExternalStore } from 'react';

// 탭(앱)을 닫으면 지워지도록 sessionStorage에 보관
const TOKEN_KEY = 'wb.token';
const listeners = new Set<() => void>();

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

let token: string | null = storage()?.getItem(TOKEN_KEY) ?? null;

function emit() {
  listeners.forEach((l) => l());
}

export const auth = {
  getToken: () => token,
  setToken(next: string) {
    token = next;
    try {
      storage()?.setItem(TOKEN_KEY, next);
    } catch {
      // 저장이 막혀 있어도 메모리 토큰으로 계속 사용
    }
    emit();
  },
  lock() {
    if (!token) return;
    token = null;
    try {
      storage()?.removeItem(TOKEN_KEY);
    } catch {
      // 무시
    }
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useAuthed() {
  return useSyncExternalStore(auth.subscribe, () => auth.getToken() !== null);
}
