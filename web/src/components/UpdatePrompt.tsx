import { useRegisterSW } from 'virtual:pwa-register/react';

/** 새 버전을 배포하면 상단에 "업데이트" 안내 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;
  return (
    <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+12px)] z-50 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-brand-600 px-4 py-3 text-sm text-white">
      <span>새 버전이 있어요</span>
      <div className="flex gap-4">
        <button type="button" className="text-stone-400" onClick={() => setNeedRefresh(false)}>
          나중에
        </button>
        <button type="button" className="font-medium" onClick={() => void updateServiceWorker(true)}>
          업데이트
        </button>
      </div>
    </div>
  );
}
