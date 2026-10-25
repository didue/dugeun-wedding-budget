import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { ErrorState, Loading } from '../components/States';
import { call } from '../lib/api';
import { auth } from '../lib/auth';
import { AUTO_LOCK_OPTIONS, getAutoLockMinutes, setAutoLockMinutes } from '../lib/autoLock';
import { manwon } from '../lib/format';
import { installStore, isIOS, isStandalone, promptInstall } from '../lib/pwa';
import { useBootstrap } from '../lib/queries';
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
          <Row to="/settings/dday" label="결혼식 날짜" value={weddingDate ?? '미설정'} />
          <Row to="/settings/budget" label="예산 설정" value={totalBudget ? `총 ${manwon(totalBudget)}원` : '미설정'} />
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
