import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;
  return <div className="bg-amber-100 px-4 py-2 pt-[calc(env(safe-area-inset-top)+8px)] text-center text-[13px] text-amber-800">연결이 없어요. 다시 연결되면 최신 내역을 불러와요</div>;
}
