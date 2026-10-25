type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

// 안드로이드 크롬: 설치 프롬프트를 잡아 두었다가 설정 탭의 "설치" 버튼에서 띄움
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  emit();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  emit();
});

export const installStore = {
  get: () => deferred,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export async function promptInstall() {
  if (!deferred) return false;
  await deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  emit();
  return choice.outcome === 'accepted';
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
