import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import NumPad from '../components/NumPad';
import { ApiError, call, errorMessage } from '../lib/api';
import { auth } from '../lib/auth';

const PIN_LENGTH = 6;
const DEFAULT_MSG = '6자리 PIN을 입력하세요';

export default function PinPage() {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean }>({ text: DEFAULT_MSG });
  const [shake, setShake] = useState(0);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const locked = lockedUntil !== null && lockedUntil > now;

  // 잠금 카운트다운
  useEffect(() => {
    if (!lockedUntil) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [lockedUntil]);

  useEffect(() => {
    if (lockedUntil && lockedUntil <= now) {
      setLockedUntil(null);
      setMsg({ text: DEFAULT_MSG });
    }
  }, [lockedUntil, now]);

  // 6자리를 다 누르면 확인 버튼 없이 바로 검사
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    let cancelled = false;
    setBusy(true);
    call<{ token: string }>('auth', { pin })
      .then((r) => {
        if (!cancelled) auth.setToken(r.token);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setPin('');
        setShake((s) => s + 1);
        setShuffleKey((k) => k + 1);
        navigator.vibrate?.(200);
        if (e instanceof ApiError && e.code === 'wrong_pin') {
          setMsg({ text: `PIN이 맞지 않아요 (남은 횟수 ${String(e.detail?.remaining ?? '-')}회)`, error: true });
        } else if (e instanceof ApiError && e.code === 'locked') {
          const sec = Number(e.detail?.retryAfterSec ?? 600);
          setNow(Date.now());
          setLockedUntil(Date.now() + sec * 1000);
        } else {
          setMsg({ text: errorMessage(e), error: true });
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pin]);

  const press = useCallback(
    (d: string) => {
      if (busy || locked) return;
      setPin((p) => (p.length >= PIN_LENGTH ? p : p + d));
    },
    [busy, locked],
  );
  const del = useCallback(() => {
    if (busy || locked) return;
    setPin((p) => p.slice(0, -1));
  }, [busy, locked]);

  // PC에서는 키보드 숫자 입력도 받음
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') del();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, del]);

  const remain = locked ? Math.ceil((lockedUntil - now) / 1000) : 0;
  const lockText = `${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, '0')} 후에 다시 시도할 수 있어요`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+64px)]">
      <div className="flex flex-1 flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-700">
          <Lock size={26} />
        </div>
        <h1 className="mt-5 text-xl font-semibold">PIN 번호 입력</h1>
        <p className="mt-1 text-sm text-stone-500">우리 결혼 가계부</p>

        <div key={shake} className={`mt-10 flex gap-4 ${shake ? 'animate-shake' : ''}`} aria-label={`${pin.length}자리 입력됨`}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${i < pin.length ? 'border-stone-900 bg-stone-900' : 'border-stone-300'}`}
            />
          ))}
        </div>

        <p role="alert" className={`mt-6 min-h-5 text-sm ${locked || msg.error ? 'text-red-600' : 'text-stone-500'}`}>
          {locked ? lockText : busy ? '확인 중…' : msg.text}
        </p>
      </div>

      <NumPad onDigit={press} onDelete={del} disabled={busy || locked} shuffleKey={shuffleKey} />
    </div>
  );
}
