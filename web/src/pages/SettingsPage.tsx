import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { ErrorState, Loading } from '../components/States';
import { call, errorMessage } from '../lib/api';
import { auth } from '../lib/auth';
import { AUTO_LOCK_OPTIONS, getAutoLockMinutes, setAutoLockMinutes } from '../lib/autoLock';
import { manwon } from '../lib/format';
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push';
import { installStore, isIOS, isStandalone, promptInstall } from '../lib/pwa';
import { useBootstrap } from '../lib/queries';
import { toast } from '../lib/toast';
import { LIST_TYPES, type ListType } from '../lib/types';

function Row({ to, label, value }: { to: string; label: string; value?: ReactNode }) {
  return (
    <Link to={to} className="flex h-12 items-center justify-between border-b border-stone-100 last:border-0">
      <span className="text-[15px]">{label}</span>
      <span className="flex items-center gap-1 text-sm text-stone-500">
        {value}
        <ChevronRight size={16} />
      </span>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold text-stone-500">{title}</h2>
      <div className="card py-0">{children}</div>
    </section>
  );
}

function InstallRow() {
  const prompt = useSyncExternalStore(installStore.subscribe, installStore.get);
  let right: ReactNode;
  if (isStandalone()) right = <span className="text-sm text-stone-500">설치됨</span>;
  else if (prompt)
    right = (
      <button type="button" className="text-sm font-medium text-brand-600" onClick={() => void promptInstall()}>
        설치
      </button>
    );
  else right = <span className="text-right text-xs text-stone-500">{isIOS() ? 'Safari 공유 버튼 → 홈 화면에 추가' : '브라우저 메뉴 → 앱 설치'}</span>;

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-stone-100 py-2 last:border-0">
      <span className="shrink-0 text-[15px]">홈 화면에 앱 설치</span>
      {right}
    </div>
  );
}

const PUSH_NOTE: Partial<Record<PushState, string>> = {
  'needs-install': '홈 화면에 추가한 앱에서 켤 수 있어요',
  unsupported: '이 브라우저는 알림을 지원하지 않아요',
  denied: '기기 설정에서 이 앱의 알림을 허용해 주세요',
};

function PushRows() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPushState().then(setState);
  }, []);

  const run = async (job: () => Promise<PushState | void>, done: string) => {
    setBusy(true);
    try {
      const next = await job();
      if (next) setState(next);
      toast(next === 'denied' ? PUSH_NOTE.denied! : done);
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!state) return null;
  const note = PUSH_NOTE[state];
  const on = state === 'on';

  return (
    <>
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-stone-100 py-2">
        <span id="push-label" className="shrink-0 text-[15px]">
          새 지출·마감일 알림
        </span>
        {note ? (
          <span className="text-right text-xs text-stone-500">{note}</span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby="push-label"
            disabled={busy}
            className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-brand-600' : 'bg-stone-200'}`}
            onClick={() => void (on ? run(disablePush, '알림을 껐어요') : run(enablePush, '알림을 켰어요'))}
          >
            <span
              className={`absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`}
            />
          </button>
        )}
      </div>
      <p className="py-2 text-xs text-stone-500">다른 기기에서 지출을 등록하면, 그리고 할 일 마감 7일 전·1일 전 오전 9시에 알려 드려요</p>
    </>
  );
}

export default function SettingsPage() {
  const { data, isLoading, error, refetch } = useBootstrap();
  const [lockMin, setLockMin] = useState(getAutoLockMinutes);

  if (isLoading) return <Loading />;
  if (!data) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const { weddingDate, totalBudget } = data.settings;

  return (
    <div>
      <PageHeader title="설정" />
      <div className="space-y-5 px-4 pb-6">
        <Section title="데이터 규칙">
          {(Object.keys(LIST_TYPES) as ListType[]).map((t) => (
            <Row key={t} to={`/settings/lists/${t}`} label={LIST_TYPES[t]} value={`${data.lists[t].length}개`} />
          ))}
        </Section>

        <Section title="일정·예산">
          <Row to="/settings/dday" label="Wedding Day" value={weddingDate ?? '미설정'} />
          <Row to="/settings/budget" label="예산 설정" value={totalBudget ? `총 ${manwon(totalBudget)}원` : '미설정'} />
        </Section>

        <Section title="알림">
          <PushRows />
        </Section>

        <Section title="앱">
          <InstallRow />
          <div className="flex h-12 items-center justify-between border-b border-stone-100">
            <label htmlFor="auto-lock" className="text-[15px]">
              자동 잠금
            </label>
            <select
              id="auto-lock"
              className="bg-transparent text-right text-sm text-stone-600"
              value={lockMin}
              onChange={(e) => {
                const v = Number(e.target.value);
                setAutoLockMinutes(v);
                setLockMin(v);
              }}
            >
              {AUTO_LOCK_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}분 동안 조작 없으면
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="flex h-12 w-full items-center text-[15px] text-red-600"
            onClick={() => {
              void call('logout').catch(() => undefined);
              auth.lock();
            }}
          >
            지금 잠그기
          </button>
        </Section>
      </div>
    </div>
  );
}
