import { useSyncExternalStore } from 'react';
import { toastStore } from '../lib/toast';

export default function Toaster() {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.get);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} role="status" className="max-w-md rounded-2xl bg-stone-900/90 px-4 py-2.5 text-sm text-white">
          {t.text}
        </div>
      ))}
    </div>
  );
}
